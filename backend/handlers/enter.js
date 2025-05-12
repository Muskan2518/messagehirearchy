const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config(); // Load environment variables

const Chat = require('../models/chat');
const Message = require('../models/message');

// Read public key
const publicKey = fs.readFileSync(path.join(__dirname, '..', 'public_key.pem'), 'utf8');

// Verify JWT token
const verifyToken = (token) => {
  if (!token) throw new Error('No token provided');
  try {
    return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Generate content from Together API
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

// Main handler
const enterChat = async (req, res) => {
  const { chatId, question } = req.body;
  const token = req.headers['authorization']?.split(' ')[1];

  if (!chatId || !question) {
    return res.status(400).json({ error: 'chatId and question are required.' });
  }

  try {
    const user = verifyToken(token);

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found.' });
    }

    const rootMessage = await Message.findById(chat.root_message_id);
    if (!rootMessage) {
      return res.status(404).json({ error: 'Root message not found.' });
    }

    const userMessage = new Message({
      chat_id: chat._id,
      parent_id: rootMessage._id,
      sender: 'user',
      content: question,
      children: [],
    });
    await userMessage.save();

    rootMessage.children.push(userMessage._id);
    await rootMessage.save();

    const aiResponse = await generateContentFromTogether(question);

    const aiMessage = new Message({
      chat_id: chat._id,
      parent_id: userMessage._id,
      sender: 'ai',
      content: aiResponse,
      children: [],
    });
    await aiMessage.save();

    userMessage.children.push(aiMessage._id);
    await userMessage.save();

    return res.status(201).json({
      message: 'Question and response added successfully.',
      userMessageId: userMessage._id,
      geminiMessageId: aiMessage._id,
      geminiAnswer: aiResponse,
    });

  } catch (error) {
    console.error('Error entering chat:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = enterChat;
