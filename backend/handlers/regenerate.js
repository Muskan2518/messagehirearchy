const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const Message = require('../models/message');

// Read public key
const publicKey = fs.readFileSync(path.join(__dirname, '..', 'public_key.pem'), 'utf8');

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Gemini call: refine or regenerate based on previous answer
const regenerateFromExistingAnswer = async (previousAnswer) => {
  const requestBody = {
    contents: [{
      parts: [{
        text: `Here is an AI-generated answer:\n\n"${previousAnswer}"\n\nImprove or regenerate this response to be clearer, more detailed, or better formatted.`
      }]
    }]
  };

  const geminiApiKey = process.env.GEMINI_API_KEY || 'YOUR_KEY_HERE'; // use .env in prod

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`,
      requestBody,
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (response.data?.candidates?.length > 0) {
      return response.data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Gemini returned no candidates.');
    }
  } catch (error) {
    console.error('Gemini error:', error.response?.data || error.message);
    throw new Error('Failed to regenerate answer with Gemini');
  }
};

// Main handler
const regenerateBranch = async (req, res) => {
  const { previousAiMessageId } = req.body;
  const token = req.headers['authorization']?.split(' ')[1];

  if (!previousAiMessageId) {
    return res.status(400).json({ error: 'Missing previousAiMessageId' });
  }

  try {
    verifyToken(token);

    // Fetch previous AI message
    const previousAiMessage = await Message.findById(previousAiMessageId);
    if (!previousAiMessage || previousAiMessage.sender !== 'ai') {
      return res.status(404).json({ error: 'Previous AI message not found or invalid sender' });
    }

    // Use Gemini to improve or modify existing answer
    const improvedAnswer = await regenerateFromExistingAnswer(previousAiMessage.content);

    // Save new AI message
    const newAiMessage = new Message({
      chat_id: previousAiMessage.chat_id,
      parent_id: previousAiMessage._id,
      sender: 'ai',
      content: improvedAnswer,
      version: (previousAiMessage.version || 0) + 1,
      children: [],
    });

    await newAiMessage.save();

    // Update parent AI message's children
    previousAiMessage.children.push(newAiMessage._id);
    previousAiMessage.is_regenerated = true;
    await previousAiMessage.save();

    // Return response
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
