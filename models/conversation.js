const mongoose = require("mongoose");
const { Schema } = require("mongoose");

const messageSchema = new Schema({
  user: { type: String, required: true },
  content: { type: String, required: true },
  // TODO: Convert to string???
  createdAt: { type: String, value: new Date() },
});

const conversationSchema = new Schema({
  users: [Schema.Types.ObjectId],
  messages: [messageSchema],
  createdAt: { type: Date, value: new Date() },
});

const conversationModel = mongoose.model("Conversation", conversationSchema);

module.exports = { conversationModel };
