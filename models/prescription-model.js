const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema({
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "appointment",
    required: true,
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  medication: { type: String, required: true },
  dosage: { type: String, required: true },
  instructions: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("prescription", prescriptionSchema);
