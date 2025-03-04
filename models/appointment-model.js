const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  time: { type: String, required: true },
  service: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true }, // Reference to the patient
});

module.exports = mongoose.model("appointment", appointmentSchema);
