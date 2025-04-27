const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');

// Load the private key from the file system
const privateKey = fs.readFileSync('private_key.pem', 'utf8');

const signin = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find the user by username
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'User not found' });

    // Compare the input password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid password' });

    // If password is valid, create the JWT
    // Sign the JWT with the private key, and set it to expire in 1 hour
    const token = jwt.sign(
      { id: user._id, username: user.username },
      privateKey, 
      { algorithm: 'RS256', expiresIn: '1h' }
    );

    // Return the token as a response
    res.json({ token });
  } catch (error) {
    console.error('Signin error:', error);  // Log the error for debugging
    res.status(500).json({ message: error.message });
  }
};

module.exports = signin;
