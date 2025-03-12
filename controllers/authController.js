const express = require("express");
const router = express.Router();
const userModel = require("../models/user-model");
const productModel = require("../models/product-model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookie = require("cookie-parser");
const { generateToken } = require("../utils/generateToken");
const { sendOTPEmail, generateOTP } = require("../utils/emailService");
const otpGenerator = require("otp-generator");
const nodemailer = require("nodemailer");

module.exports.registerUser = async (req, res) => {
  try {
    let { email, fullname, password, address, phone, age, sex } = req.body;

    // Check if user already exists
    let user = await userModel.findOne({ email: email });
    if (user) {
      req.flash("error", "You already have an account, please login.");
      return res.redirect("/register");
    }

    // Generate hashed password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate OTP and set expiry time
    const { otp, otpExpiry } = generateOTP();
    //  Corrected: Store in session
    if (!req.session) {
      return res.status(500).send("Session is not initialized.");
    }

    req.session.user = {
      email,
      fullname,
      password: hashedPassword,
      address,
      phone,
      age,
      sex,
      otp,
      otpExpiry,
    };
    console.log("User stored in session");

    // Send OTP via Email
    sendOTPEmail(email, otp);

    return res.redirect("/otp-verification");
  } catch (err) {
    console.error("Error registering user:", err);
    res.status(500).send("Internal Server Error");
  }
};

module.exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({
      email: email,
      isVerified: true,
    });

    if (!user) {
      req.flash("error", "Email or password is incorrect!");
      return res.redirect("/login");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash("error", "Email or password is incorrect!");
      return res.redirect("/login");
    }

    // Store the current timestamp as the last login time
    const lastLogin = user.lastLogin;
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token after successful login
    const token = generateToken(user);

    // Store token in HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    });

    req.flash("success", "User logged in successfully");

    // Redirect based on user role
    if (user.role === "admin") {
      return res.redirect("/doctor/doctor-dashboard");
      // return res.redirect("/admin-dashboard");
    } else if (user.role === "staff") {
      return res.send("This is staff page boss.");
      // return res.redirect("/staff-dashboard");
    } else {
      return res.send(`<script>window.location.href = "/";</script>`); // Reload page after login
    }
  } catch (err) {
    console.error("Error during login:", err);
    req.flash("error", "An error occurred during login. Please try again.");
    return res.redirect("/login");
  }
};

module.exports.logout = async (req, res) => {
  try {
    res.cookie("token", ""); // Clear the token cookie
    req.flash("success", "User logged out successfully");
    res.redirect("/login");
  } catch (err) {
    res.send(err.message);
  }
};
