const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const Message = require('../models/message');
require('dotenv').config(); // Load .env variables

// Load public key
const publicKey = fs.readFileSync(path.join(__dirname, '..', 'public_key.pem'), 'utf8');

// Verify JWT token
const verifyToken = (token) => {
  if (!token) throw new Error('No token provided');
  try {
    return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    throw new Error('Invalid or expired token');
  }
};

// Generate improved content using Together API
const regenerateFromExistingAnswer = async (previousAnswer) => {
  try {
    const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
    if (!TOGETHER_API_KEY) throw new Error('TOGETHER_API_KEY not set in environment');

    const response = await axios.post(
      'https://api.together.xyz/v1/chat/completions',
      {
        model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
        messages: [
          { role: "user", content: `Improve or rewrite the following answer:\n\n"${previousAnswer}"` }
        ]
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

// Route handler
const regenerateBranch = async (req, res) => {
  const { previousAiMessageId } = req.body;
  const token = req.headers['authorization']?.split(' ')[1];

  if (!previousAiMessageId) {
    return res.status(400).json({ error: 'Missing previousAiMessageId' });
  }

  try {
    verifyToken(token);

    const previousAiMessage = await Message.findById(previousAiMessageId);
    if (!previousAiMessage || previousAiMessage.sender !== 'ai') {
      return res.status(404).json({ error: 'Previous AI message not found or not from AI' });
    }

    const improvedAnswer = await regenerateFromExistingAnswer(previousAiMessage.content);

    const newAiMessage = new Message({
      chat_id: previousAiMessage.chat_id,
      parent_id: previousAiMessage._id,
      sender: 'ai',
      content: improvedAnswer,
      version: (previousAiMessage.version || 0) + 1,
      children: [],
    });

    await newAiMessage.save();

    previousAiMessage.children.push(newAiMessage._id);
    previousAiMessage.is_regenerated = true;
    await previousAiMessage.save();

    return res.status(201).json({
      message: 'Branch regeneration successful.',
      newAiMessageId: newAiMessage._id,
      newAnswer: improvedAnswer,
    });

  } catch (error) {
    console.error('Error in /regenerateBranch:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = regenerateBranch;
