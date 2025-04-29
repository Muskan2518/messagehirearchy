const express = require('express');
const dotenv = require('dotenv');
const fs = require('fs');
const { generateKeyPairSync } = require('crypto');
const connectDB = require('./database/connect');
const cors = require('cors');

// Allow requests from localhost:3000



dotenv.config();
const app = express();
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true // if you're using cookies or sessions
}));


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
const signin = require('./handlers/signin');
app.post('/signin', signin);

const signup = require('./handlers/signup');
app.post('/signup', signup);

const askQuestion = require('./handlers/askQuestion');
app.post('/askQuestion', askQuestion);

const createNewChat = require('./handlers/createNewChat');
app.post('/createNewChat', createNewChat);

const enter = require('./handlers/enter');
app.post('/enter', enter);

const edit = require('./handlers/edit');   // ✅ you forgot this part
app.post('/edit/:messageId', edit);      
const regenerate=require('./handlers/regenerate')
app.post('/regenerate',regenerate)
const respond=require('./handlers/respond')
app.post('/respond',respond)
const getChatHistory=require('./handlers/getChatHistory')
app.get('/getChatHistory',getChatHistory)
const getSpecificHistory=require('./handlers/getSpecificHistory')
app.get('/getSpecificHistory/:chatId',getSpecificHistory)
// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
