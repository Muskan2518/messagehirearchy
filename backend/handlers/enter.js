const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const Chat = require('../models/chat');
const Message = require('../models/message');
const User = require('../models/User');

// Read public key
const publicKey = fs.readFileSync(path.join(__dirname, '..', 'public_key.pem'), 'utf8');

// Verify JWT token
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Generate content from Gemini
const generateContentFromGemini = async (question) => {
  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: question,
          },
        ],
      },
    ],
  };

  try {
    const geminiApiKey = process.env.GEMINI_API_KEY ; // use .env in prod

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data.candidates && response.data.candidates.length > 0) {
      return response.data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Gemini response does not contain valid data.');
    }
  } catch (error) {
    console.error('Error generating content from Gemini:', error.response ? error.response.data : error.message);
    throw new Error('Error generating response from Gemini API.');
  }
};

// Main handler: Enter a new question into chat
const enterChat = async (req, res) => {
  const { chatId, question } = req.body;
  const token = req.headers['authorization']?.split(' ')[1];

  if (!chatId || !question) {
    return res.status(400).json({ error: 'chatId and question are required.' });
  }

  try {
    // Verify user
    const user = verifyToken(token);

    // Find the chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found.' });
    }

    // Find the root message
    const rootMessage = await Message.findById(chat.root_message_id);
    if (!rootMessage) {
      return res.status(404).json({ error: 'Root message not found.' });
    }

    // Save the user's question as a child of the root message
    const userMessage = new Message({
      chat_id: chat._id,
      parent_id: rootMessage._id,
      sender: 'user',
      content: question,
      children: [],
    });
    await userMessage.save();

    // Push user message ID to root message's children
    rootMessage.children.push(userMessage._id);
    await rootMessage.save();

    // Generate Gemini's answer
    const geminiAnswer = await generateContentFromGemini(question);

    // Save the Gemini answer as a child of the user's question
    const geminiMessage = new Message({
      chat_id: chat._id,
      parent_id: userMessage._id,
      sender: 'ai',
      content: geminiAnswer,
      children: [],
    });
    await geminiMessage.save();

    // Push Gemini message ID to user's message's children
    userMessage.children.push(geminiMessage._id);
    await userMessage.save();

    return res.status(201).json({
        message: 'Question and response added successfully.',
        userMessageId: userMessage._id,
        geminiMessageId: geminiMessage._id,
        geminiAnswer: geminiAnswer,  // 👈 also returning the Gemini response text
      });
      

  } catch (error) {
    console.error('Error entering chat:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = enterChat;
