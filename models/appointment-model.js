const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  time: { type: String, required: true },
  service: { type: String, required: true },
  status: { type: String, enum: ["Pending", "Accepted"], default: "Pending" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true }, // Reference to the patient
});

module.exports = mongoose.model("appointment", appointmentSchema);
