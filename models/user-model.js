const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullname: { type: String, minlength: 3, trim: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "staff", "admin"], default: "staff" },
  phone: String,
  age: Number,
  sex: String,
  address: String,
  avatar: Buffer,
  otp: String,
  otpExpiry: { type: Date },
  isVerified: { type: Boolean, default: false },
  lastLogin: { type: Date },
});

module.exports = mongoose.model("user", userSchema);
