const fs = require('fs');
const jwt = require('jsonwebtoken');
const path = require('path');
const axios = require('axios');

// Read the public key (adjust the path if necessary)
const publicKey = fs.readFileSync(path.join(__dirname, '..', 'public_key.pem'), 'utf8');  // Adjust the path

// Function to verify JWT token using public key
const verifyToken = (token) => {
  try {
    // Verify the token using the public key
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    return decoded;  // Returns the decoded payload if valid
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Function to generate content from Gemini API
const generateContentFromGemini = async (question) => {
  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: question,  // Send the question as the text to generate the response
          },    
        ],
      },
    ],
  };

  try {
    const geminiApiKey = process.env.GEMINI_API_KEY; // use .env in prod

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // Check if the response is valid and contains the data
    if (response.data && response.data.candidates && response.data.candidates.length > 0) {
      return response.data.candidates[0].content.parts[0].text;  // Return the response text
    } else {
      throw new Error('Gemini response does not contain valid data.');
    }
  } catch (error) {
    console.error('Error generating content from Gemini:', error.response ? error.response.data : error.message);
    throw new Error('Error generating response from Gemini API.');
  }
};

// Main route handler for asking a question
const askQuestion = async (req, res) => {
  const { question } = req.body;  // Extract the question from the request body
  const token = req.headers['authorization']?.split(' ')[1];  // Extract token from Authorization header

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Invalid question format' });
  }

  try {
    // Verify the JWT token before processing the request
    const user = verifyToken(token);  // Decode and verify the token

    // If token is valid, process the request and get the response from Gemini
    const answer = await generateContentFromGemini(question);
    return res.json({ answer });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = askQuestion;
