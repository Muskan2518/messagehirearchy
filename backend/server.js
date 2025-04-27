const express = require('express');
const dotenv = require('dotenv');
const fs = require('fs');
const { generateKeyPairSync } = require('crypto');
const connectDB = require('./database/connect');

dotenv.config();
const app = express();

// Connect to MongoDB
connectDB();

// Generate a 2048-bit RSA key pair if not already generated
if (!fs.existsSync('private_key.pem') || !fs.existsSync('public_key.pem')) {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'pkcs1',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs1',
      format: 'pem',
    },
  });

  fs.writeFileSync('private_key.pem', privateKey);
  fs.writeFileSync('public_key.pem', publicKey);

  console.log('✅ RSA Key pair generated: private_key.pem and public_key.pem');
}

// Middleware
app.use(express.json());

// Routes
app.get('/ping', async (req, res) => {
  try {
    res.status(200).json({ message: 'pong' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auth Routes

const signin = require('./handlers/signin');  // Import the signin function
app.post('/signin', signin);  // Pass it as a function handler
const signup = require('./handlers/signup');  // Import the signin function
app.post('/signup', signup);  // Pass it as a function handler
const askQuestion =require('./handlers/askQuestion')
app.post('/askQuestion',askQuestion)
const createNewChat =require('./handlers/createNewChat')
app.post('/createNewChat',createNewChat)


// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
