const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
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
const generateContentFromGemini = async (question) => {
  // Return a constant string for any question
  const response = "This is a constant response for any question.";
  try {
    return response;
  } catch (error) {
    console.error('Error generating content:', error.message);
    throw new Error('Error generating response.');
  }
};

// Main handler for regenerating an AI message
const regenerateBranch = async (req, res) => {
  const { previousAiMessageId } = req.body;
  const token = req.headers['authorization']?.split(' ')[1];

  if (!previousAiMessageId) {
    return res.status(400).json({ error: 'Missing previousAiMessageId' });
  }

  try {
    verifyToken(token);

    // Fetch the previous AI message
    const previousAiMessage = await Message.findById(previousAiMessageId);
    if (!previousAiMessage || previousAiMessage.sender !== 'ai') {
      return res.status(404).json({ error: 'Previous AI message not found or invalid sender' });
    }

    // Use Gemini (or the constant response for this case) to improve or modify the answer
    const improvedAnswer = await generateContentFromGemini(previousAiMessage.content);

    // Save the new AI message
    const newAiMessage = new Message({
      chat_id: previousAiMessage.chat_id,
      parent_id: previousAiMessage._id,
      sender: 'ai',
      content: improvedAnswer,
      version: (previousAiMessage.version || 0) + 1,
      children: [],
    });

    await newAiMessage.save();

    // Update the parent AI message's children
    previousAiMessage.children.push(newAiMessage._id);
    previousAiMessage.is_regenerated = true;
    await previousAiMessage.save();

    // Return the response
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
