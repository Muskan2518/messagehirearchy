const Message = require('../models/message');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config(); // Make sure this is at the top of your main entry file

// Read public key for JWT verification
const publicKey = fs.readFileSync(path.join(__dirname, '..', 'public_key.pem'), 'utf8');

// Verify JWT token
const verifyToken = (token) => {
  if (!token) throw new Error('Authorization token is missing');
  try {
    return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
  } catch (error) {
    console.error('JWT Verification Error:', error.message);
    throw new Error('Invalid or expired token');
  }
};

// Together API (LLaMA 3) call
const generateContentFromGemini = async (question) => {
  try {
    const apiKey = process.env.TOGETHER_API_KEY;
    if (!apiKey) throw new Error('TOGETHER_API_KEY is not set in the environment');

    const response = await axios.post(
      'https://api.together.xyz/v1/chat/completions',
      {
        model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
        messages: [{ role: "user", content: question }],
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices?.[0]?.message?.content || 'No response from AI';
  } catch (error) {
    console.error('Together API Error:', error.response?.data || error.message);
    throw new Error('Failed to generate response from Together API.');
  }
};

const respondToAiMessage = async (req, res) => {
  const { previousAiMessageId, newUserQuestion } = req.body;
  const token = req.headers['authorization']?.split(' ')[1];

  if (!previousAiMessageId || !newUserQuestion) {
    return res.status(400).json({ error: 'Missing previousAiMessageId or newUserQuestion' });
  }

  try {
    verifyToken(token);

    const previousAiMessage = await Message.findById(previousAiMessageId);
    if (!previousAiMessage) {
      return res.status(404).json({ error: 'Previous AI message not found' });
    }

    const newUserMessage = new Message({
      chat_id: previousAiMessage.chat_id,
      parent_id: previousAiMessageId,
      sender: 'user',
      content: newUserQuestion,
      version: 1,
      children: [],
    });
    await newUserMessage.save();

    const aiResponseContent = await generateContentFromGemini(newUserQuestion);

    const newAiMessage = new Message({
      chat_id: previousAiMessage.chat_id,
      parent_id: newUserMessage._id,
      sender: 'ai',
      content: aiResponseContent,
      version: 1,
      children: [],
    });
    await newAiMessage.save();

    previousAiMessage.children.push(newUserMessage._id);
    await previousAiMessage.save();

    newUserMessage.children.push(newAiMessage._id);
    await newUserMessage.save();

    return res.status(201).json({
      message: 'Responded to AI message successfully.',
      newUserMessageId: newUserMessage._id,
      newAiMessageId: newAiMessage._id,
      aiResponse: aiResponseContent,
    });

  } catch (error) {
    console.error('Error in /respondToAiMessage:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = respondToAiMessage;
