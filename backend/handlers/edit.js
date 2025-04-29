const Message = require('../models/message');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const axios = require('axios');


// Read the public key for verifying JWT
const publicKey = fs.readFileSync(path.join(__dirname, '..', 'public_key.pem'), 'utf8');

// Verify token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};
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
      const geminiApiKey = process.env.GEMINI_API_KEY ;
    
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
    

// Controller to handle editing a message
const editMessage = async (req, res) => {
  const { messageId } = req.params; // ID of the user's original message
  const { newContent } = req.body;
  const token = req.headers['authorization']?.split(' ')[1];

  if (!newContent || typeof newContent !== 'string') {
    return res.status(400).json({ error: 'Invalid new content format' });
  }

  try {
    const user = verifyToken(token);

    // Find the original user message
    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) {
      return res.status(404).json({ error: 'Original message not found' });
    }

    // Create the new edited message
    const newEditedMessage = new Message({
      chat_id: originalMessage.chat_id,     // Same chat
      parent_id: originalMessage._id,        // Parent is the original question
      sender: "user",                 // Current user
      content: newContent,
      version: (originalMessage.version || 0) + 1, // Increment version
      children: []
    });
    await newEditedMessage.save();

    // Update the original message
    originalMessage.is_edited = true;
    originalMessage.children.push(newEditedMessage._id); // Add new edited message as a child
    await originalMessage.save();
    const geminiAnswer = await generateContentFromGemini(newContent);
const geminiMessage = new Message({
      chat_id: originalMessage.chat_id,
      parent_id: newEditedMessage._id,
      sender: 'ai',
      content: geminiAnswer,
      children: [],
    });
    await geminiMessage.save();
    newEditedMessage.children.push(geminiMessage._id);
    await newEditedMessage.save();

    return res.status(201).json({
      message: 'Edited message created successfully.',
      newEditedMessage: newEditedMessage._id,
        geminiMessageId: geminiMessage._id,
        geminiAnswer: geminiAnswer,
        messageId:messageId

    });

  } catch (error) {
    console.error('Edit message error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};

module.exports = editMessage;
