const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  name: { type: String, required: true }, // User's name
  email: { type: String, required: true }, // User's email
  message: { type: String, required: true }, // User's message
  createdAt: { type: Date, default: Date.now }, // Timestamp of when the message was sent
});

module.exports = mongoose.model("message", messageSchema);
