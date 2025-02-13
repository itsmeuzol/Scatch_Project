const express = require("express");
const router = express.Router();
const userModel = require("../models/user-model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookie = require("cookie-parser");
const isLoggedIn = require("../middlewares/isLoggedIn");
const { verifyOTP } = require("../utils/emailService");
const { generateToken } = require("../utils/generateToken");
const {
  registerUser,
  loginUser,
  logout,
} = require("../controllers/authController");

//register
router.get("/register", (req, res) => {
  res.render("register");
});

router.post("/register", registerUser);

// Route to render OTP verification page
router.get("/otp-verification", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/register"); // If session expires, redirect to register
  }
  res.render("otp-verification"); // Render OTP input form
});

// Route to handle OTP verification for register user
router.post("/verify-otp", async (req, res) => {
  const { otp } = req.body;
  if (!req.session.user) {
    return res.status(400).send("Session expired. Please register again.");
  }
  const {
    email,
    fullname,
    password,
    otp: sessionOtp,
    otpExpiry,
    isPasswordReset,
  } = req.session.user; // Get user data from .user;

  // Verify OTP
  const { success, message } = verifyOTP(otp, sessionOtp, otpExpiry);
  if (!success) {
    return res.status(400).send(message);
  }

  if (isPasswordReset === true) {
    // Redirect to reset password page
    res.redirect("/reset-password");
  } else {
    const user = new userModel({
      fullname,
      email,
      password,
      isVerified: true,
    });
    await user.save();

    // Clear session data after successful verification
    req.session.destroy();

    console.log("OTP verified successfully!");
    res.redirect("/login");
  }
});

//login
router.post("/login", loginUser);

router.get("/logout", logout);

module.exports = router;
