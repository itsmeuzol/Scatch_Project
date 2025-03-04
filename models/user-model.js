const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  fullname: {
    type: String,
    minlength: 3,
    trim: true,
  },
  email: { type: String, unique: true, required: true },
  password: String,
  role: { type: String, enum: ["user", "staff", "admin"], default: "user" },
  phone: String,
  age: Number,
  sex: String,
  address: String,
  otp: String,
  otpExpiry: {
    type: Date, // Store the expiration time of the OTP
  },
  isVerified: { type: Boolean, default: false }, // User is unverified initially
  cart: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product", // Corrected `ref` usage
    },
  ],
  lastLogin: { type: Date },
});

module.exports = mongoose.model("user", userSchema);
