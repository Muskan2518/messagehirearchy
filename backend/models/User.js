const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose; // Cleaner import

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  chats: [{ type: Types.ObjectId, ref: 'Chat' }], // Proper ObjectId reference
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

// Optionally: Automatically update `updated_at` on save
userSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = model('User', userSchema);
