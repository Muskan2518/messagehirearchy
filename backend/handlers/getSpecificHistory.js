const mongoose = require('mongoose');
const Message = require('../models/message');

const getSpecificHistory = async (req, res) => {
  const { chatId } = req.params;

  try {
    const objectChatId = mongoose.Types.ObjectId.isValid(chatId)
      ? new mongoose.Types.ObjectId(chatId)
      : chatId;

    // Step 1: Fetch all messages with this chat ID
    const messages = await Message.find({ chat_id: objectChatId }).lean();

    if (!messages.length) {
      return res.status(404).json({ error: 'No chat history found for this chat ID' });
    }

    // Step 2: Build a map of message _id => message object
    const messageMap = {};
    messages.forEach(msg => {
      messageMap[msg._id.toString()] = {
        ...msg,
        parent_id: msg.parent_id?.toString() || null,
        children: [] // We'll fill this manually based on `parent_id`
      };
    });

    // Step 3: Build the tree
    const roots = [];

    messages.forEach(msg => {
      const msgId = msg._id.toString();
      const parentId = msg.parent_id?.toString();

      if (parentId && messageMap[parentId]) {
        messageMap[parentId].children.push(messageMap[msgId]);
      } else {
        roots.push(messageMap[msgId]); // It's a root message
      }
    });

    return res.status(200).json(roots);
  } catch (error) {
    console.error('Error in /specificHistory/:chatId:', error);
    return res.status(500).json({ error: 'Failed to fetch specific history' });
  }
};

module.exports = getSpecificHistory;
