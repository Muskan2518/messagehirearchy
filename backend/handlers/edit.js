const Message = require('../models/message');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config(); // Load .env variables

// Load public key
const publicKey = fs.readFileSync(path.join(__dirname, '..', 'public_key.pem'), 'utf8');

// JWT verification
const verifyToken = (token) => {
  if (!token) throw new Error('No token provided');
  try {
    return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Together API content generation
const generateContentFromTogether = async (question) => {
  const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
  if (!TOGETHER_API_KEY) throw new Error('TOGETHER_API_KEY not set in environment');

  try {
    const response = await axios.post(
      'https://api.together.xyz/v1/chat/completions',
      {
        model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
        messages: [{ role: "user", content: question }],
      },
      {
        headers: {
          'Authorization': `Bearer ${TOGETHER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices?.[0]?.message?.content || 'No response from model';
  } catch (error) {
    console.error('Together API error:', error.response?.data || error.message);
    throw new Error('Failed to generate response from Together API');
  }
};

// Controller: edit a user message
const editMessage = async (req, res) => {
  const { messageId } = req.params;
  const { newContent } = req.body;
  const token = req.headers['authorization']?.split(' ')[1];

  if (!newContent || typeof newContent !== 'string') {
    return res.status(400).json({ error: 'Invalid new content format' });
  }

  try {
    const user = verifyToken(token);

    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) {
      return res.status(404).json({ error: 'Original message not found' });
    }

    // Create new edited user message
    const editedMessage = new Message({
      chat_id: originalMessage.chat_id,
      parent_id: originalMessage._id,
      sender: 'user',
      content: newContent,
      version: (originalMessage.version || 0) + 1,
      children: [],
    });
    await editedMessage.save();

    // Mark original as edited
    originalMessage.is_edited = true;
    originalMessage.children.push(editedMessage._id);
    await originalMessage.save();

    // Generate AI response to edited message
    const aiResponse = await generateContentFromTogether(newContent);

    const aiMessage = new Message({
      chat_id: originalMessage.chat_id,
      parent_id: editedMessage._id,
      sender: 'ai',
      content: aiResponse,
      children: [],
    });
    await aiMessage.save();

    // Link AI response to edited message
    editedMessage.children.push(aiMessage._id);
    await editedMessage.save();

    return res.status(201).json({
      message: 'Edited message created successfully.',
      newEditedMessageId: editedMessage._id,
      geminiMessageId: aiMessage._id,
      geminiAnswer: aiResponse,
      originalMessageId: messageId,
    });

  } catch (error) {
    console.error('Edit message error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = editMessage;
