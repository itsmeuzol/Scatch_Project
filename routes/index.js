const express = require("express");
const router = express.Router();
const isLoggedIn = require("../middlewares/isLoggedIn");
const productModel = require("../models/product-model");
const userModel = require("../models/user-model");
const appointmentModel = require("../models/appointment-model");
const contactModel = require("../models/contact-model");
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
    let error = req.flash("error");
    let product = await productModel.find();
    res.render("index", { product, success, user: req.user, error });
  } catch (err) {
    console.error("Error fetching cart products:", err);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/buynow", async (req, res) => {
  req.flash("error", "You Need to Login First!");
  res.redirect("/");
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
  let success = req.flash("success");
  res.render("contact", { success });
});
//for contact us message
router.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;
  const contact = new contactModel({ name, email, message });
  await contact.save();
  req.flash("success", "Message sent successfully!");
  res.redirect("/contact");
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
  let success = req.flash("success");
  res.render("forgot-password", { error, success });
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
      req.flash("success", "Please check your email for OTP!");
      res.redirect("/otp-verification");
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

// Route to render OTP verification page
router.get("/otp-verification", (req, res) => {
  let error = req.flash("error");
  let success = req.flash("success");
  if (!req.session.user) {
    return res.redirect("/register"); // If session expires, redirect to register
  }
  res.render("otp-verification", { error, success }); // Render OTP input form
});

//resend otp
router.get("/resend-otp", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/register"); // If session expires, redirect to register
  }
  const { email, otp, otpExpiry } = req.session.user;
  sendOTPEmail(email, otp);
  req.flash("success", "OTP sent again successfully!");
  res.redirect("/otp-verification");
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
    address,
    phone,
    age,
    sex,
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
      address,
      age,
      phone,
      sex,
      isVerified: true,
    });
    await user.save();

    // Clear session data after successful verification
    req.session.destroy();

    console.log("OTP verified successfully!");
    // req.flash("success", "OTP verified successfully!");
    res.redirect("/login");
  }
});

// Route to render reset password page
router.get("/reset-password", (req, res) => {
  let success = req.flash("success");
  res.render("reset-password", { success });
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
  req.flash("success", "Password reset successfully!");
  res.redirect("/login");
  req.session.destroy();
});

module.exports = router;
