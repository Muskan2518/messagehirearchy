const Message = require('../models/message');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const publicKey = fs.readFileSync(path.join(__dirname, '..', 'public_key.pem'), 'utf8');

// Verify token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Gemini API Call
const generateContentFromGemini = async (question) => {
  // You can choose to use the question or ignore it
  const response = "This is a constant response for any question.";

  try {
    // Instead of calling the Gemini API, directly return a constant string
    return response;
  } catch (error) {
    console.error('Error generating content:', error.message);
    throw new Error('Error generating response.');
  }
};


const respondToAiMessage = async (req, res) => {
  const { previousAiMessageId, newUserQuestion } = req.body;
  const token = req.headers['authorization']?.split(' ')[1];

  if (!previousAiMessageId || !newUserQuestion) {
    return res.status(400).json({ error: 'Missing previousAiMessageId or newUserQuestion' });
  }

  try {
    // Verify token
    verifyToken(token);

    // Step 1: Find previous AI message
    const previousAiMessage = await Message.findById(previousAiMessageId);
    if (!previousAiMessage) {
      return res.status(404).json({ error: 'Previous AI message not found' });
    }

    // Step 2: Create new User Message (child of previous AI message)
    const newUserMessage = new Message({
      chat_id: previousAiMessage.chat_id,   // Keep same chat id
      parent_id: previousAiMessageId,
      sender: 'user',
      content: newUserQuestion,
      version: 1,
      children: [],
    });
    await newUserMessage.save();

    // Step 3: Generte AI response
    const aiResponseContent = await generateContentFromGemini(newUserQuestion);

    // Step 4: Create AI Response (child of new user message)
    const newAiMessage = new Message({
      chat_id: previousAiMessage.chat_id,
      parent_id: newUserMessage._id,
      sender: 'ai',
      content: aiResponseContent,
      version: 1,
      children: [],
    });
    await newAiMessage.save();

    // Step 5: Update children arrays
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

module.exports = respondToAiMessage ;
