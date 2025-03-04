const express = require("express");
const router = express.Router();
const isLoggedIn = require("../middlewares/isLoggedIn");
const productModel = require("../models/product-model");
const userModel = require("../models/user-model");
const appointmentModel = require("../models/appointment-model");
const bcrypt = require("bcrypt");
const {
  sendOTPEmail,
  generateOTP,
  verifyOTP,
} = require("../utils/emailService");

router.get("/register", (req, res) => {
  let error = req.flash("error");
  let success = req.flash("success");
  res.render("register", { error, success });
});

router.get("/login", (req, res) => {
  let error = req.flash("error");
  let success = req.flash("success");
  res.render("login", { error, success });
});

//get medicine in home page
router.get("/", async (req, res) => {
  try {
    let success = req.flash("success");
    let product = await productModel.find();
    res.render("index", { product, success });
  } catch (err) {
    console.error("Error fetching cart products:", err);
    res.status(500).send("Internal Server Error");
  }
});

//service
router.get("/service", (req, res) => {
  res.render("service");
});
//about
router.get("/about", (req, res) => {
  res.render("about");
});

//contact us
router.get("/contact", (req, res) => {
  res.render("contact");
});
//help
router.get("/help", (req, res) => {
  res.render("help");
});
//blog
router.get("/blog", (req, res) => {
  res.render("blog");
});
//route to get forgot password page
router.get("/forgot-password", (req, res) => {
  let error = req.flash("error");
  res.render("forgot-password", { error });
});
// Route to post forgot password
router.post("/forgot-password", async (req, res) => {
  try {
    let user = await userModel.findOne({ email: req.body.email });
    if (user) {
      const { otp, otpExpiry } = generateOTP(); // Generate OTP
      req.session.user = {
        email: user.email,
        otp,
        otpExpiry,
        isPasswordReset: true, // Flag to indicate password reset
      };
      sendOTPEmail(user.email, otp); // Send OTP to user's email
      res.render("otp-verification", { user });
    } else {
      req.flash("error", "User not found.");
      res.redirect("/forgot-password");
    }
  } catch (err) {
    console.error("Error in forgot password route:", err);
    req.flash("error", "An error occurred. Please try again.");
    res.redirect("/forgot-password");
  }
});

// Route to render reset password page
router.get("/reset-password", (req, res) => {
  res.render("reset-password");
});

// Route to handle reset password form submission
router.post("/reset-password", async (req, res) => {
  const user = await userModel.findOne({ email: req.session.user.email });
  const { newPassword } = req.body;
  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);
  // Update user's password
  user.password = hashedPassword;
  await user.save();
  // Clear session data after successful password reset
  req.session.destroy();

  console.log("Password reset successfully!");
  res.redirect("/login");
});

module.exports = router;
