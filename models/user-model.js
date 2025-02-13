const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  fullname: {
    type: String,
    minlength: 3,
    trim: true,
  },
  email: String,
  password: String,
  isAdmin: Boolean,
  phone: Number,
  otp: String,
  otpExpiry: {
    type: Date, // Store the expiration time of the OTP
  },
  isVerified: { type: Boolean, default: false }, // User is unverified initially
  orders: {
    item: Array,
    default: [],
  },
  cart: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product", // Corrected `ref` usag
    },
  ],
  picture: String,
});

module.exports = mongoose.model("user", userSchema);
