const mongoose = require('mongoose');
const { Schema, model, Types } = mongoose;

const messageSchema = new Schema({
  chat_id: { type: Types.ObjectId, ref: 'Chat', required: true }, // Which chat this message belongs to
  parent_id: { type: Types.ObjectId, ref: 'Message', default: null }, // Parent message (null if root)
  sender: { type: String, enum: ['user', 'ai'], required: true }, // Who sent the message
  content: { type: String, required: true },
  version: { type: Number, default: 1 }, // Edits increase version
  is_edited: { type: Boolean, default: false },
  is_regenerated: { type: Boolean, default: false },
  children: [{ type: Types.ObjectId, ref: 'Message' }], // List of child message IDs
  metadata: {
    timestamp: { type: Date, default: Date.now },
    performance: {
      latency_ms: { type: Number },
      model_version: { type: String }
    }
  }
}, { timestamps: true });

module.exports = model('Message', messageSchema);
