const mongoose = require("mongoose");

const vaccineSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Name of the vaccine
  description: { type: String, required: true }, // Description of the vaccine
  availableSlots: { type: Number, required: true }, // Number of available slots
  hospital: { type: String, required: true }, // Hospital where the vaccine is available
  createdAt: { type: Date, default: Date.now }, // Timestamp of when the vaccine was added
});

module.exports = mongoose.model("vaccine", vaccineSchema);
