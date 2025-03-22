const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true }, // Reference to the user
  vaccine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "vaccine",
    required: true,
  }, // Reference to the vaccine
  bookingDate: { type: Date, default: Date.now }, // Date of booking
  status: { type: String, enum: ["Pending", "Completed"], default: "Pending" }, // Booking status
  ticketId: { type: String, unique: true }, // Unique ticket ID
});

module.exports = mongoose.model("booking", bookingSchema);
