const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const chatSchema = new Schema({
  username: { type: String, ref: 'User', required: true }, // Owner of the chat
  title: { type: String, default: 'New Chat' }, // Chat title, can be changed by user
  root_message_id: { type: Types.ObjectId, ref: 'Message' }, // Starting message (optional)
  metadata: {
    tags: [{ type: String }],
    last_message_time: { type: Date }
  }
}, { timestamps: true }); // createdAt, updatedAt

module.exports = model('Chat', chatSchema);
