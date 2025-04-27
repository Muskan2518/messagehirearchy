const fs = require('fs');
const jwt = require('jsonwebtoken');
const path = require('path');
const User = require('../models/User');
const Message = require('../models/message');
const Chat = require('../models/chat');

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

// Create a new chat function
const createNewChat = async (req, res) => {
  const { title } = req.body;
  const token = req.headers['authorization']?.split(' ')[1];  // Extract token from Authorization header

  if (!title) {
    return res.status(400).json({ error: 'Title is required for the new chat.' });
  }

  try {
    // Verify the JWT token before processing the request
    const decoded = verifyToken(token);  // Decode and verify the token

    // Find the user by the decoded username
    const user = await User.findOne({ username: decoded.username });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // 1. Create the chat with title and metadata
    const newChat = new Chat({
      username: user.username,
      title: title || 'New Chat',
      metadata: { last_message_time: new Date() },
    });
    await newChat.save();  // Save the chat

    // 2. Create the root message (empty message as root)
    const rootMessage = new Message({
      chat_id: newChat._id,  // Set the correct chat_id immediately
      parent_id: null,  // No parent for the root message
      sender: 'user',  // Ensure that 'system' is a valid enum value in the schema
      content: 'Welcome to the chat!',  // Add some default content
      children: [],  // No child messages initially
    });

    // Save the root message
    await rootMessage.save();

    // 3. Update the chat with the root message ID
    newChat.root_message_id = rootMessage._id;
    await newChat.save();

    // 4. Add the new chat to the user's chat list
    await User.findByIdAndUpdate(user._id, { $push: { chats: newChat._id } });

    return res.status(201).json({ message: 'Chat created successfully', chatId: newChat._id });
  } catch (error) {
    console.error('Error:', error);  // Log error for debugging
    return res.status(500).json({ error: error.message });
  }
};

module.exports = createNewChat;
