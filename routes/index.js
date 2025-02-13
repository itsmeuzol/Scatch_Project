const express = require("express");
const router = express.Router();
const isLoggedIn = require("../middlewares/isLoggedIn");
const productModel = require("../models/product-model");
const userModel = require("../models/user-model");
const bcrypt = require("bcrypt");
const {
  sendOTPEmail,
  generateOTP,
  verifyOTP,
} = require("../utils/emailService");

router.get("/register", (req, res) => {
  let error = req.flash("error");
  let success = req.flash("success");
  res.render("register", { error, success, loggedin: false });
});

router.get("/login", (req, res) => {
  let error = req.flash("error");
  let success = req.flash("success");
  res.render("login", { error, success, loggedin: false });
});

router.get("/shop", isLoggedIn, async (req, res) => {
  try {
    let product = await productModel.find();
    let success = req.flash("success");
    res.render("shop", { product, success });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

router.get("/addtocart/:productid", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  user.cart.push(req.params.productid);
  await user.save();
  req.flash("success", "Product added to cart");
  res.redirect("/shop");
});

// Cart page
router.get("/cart", isLoggedIn, async (req, res) => {
  let user = await userModel
    .findOne({ email: req.user.email })
    .populate("cart");
  let success = req.flash("success"); // Get flash message

  res.render("cart", { user, success }); // Pass 'success' to the template
});

//delete cart item
router.post("/cart/delete/:item_id", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  let index = user.cart.indexOf(req.params.item_id);
  user.cart.splice(index, 1);
  await user.save();
  req.flash("success", "Product removed from cart");
  res.redirect("/cart");
});

router.get("/", (req, res) => {
  res.render("index");
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
      console.log(req.session.user);
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
  console.log("Password reset successfully!");
  res.redirect("/login");
});

//profile
router.get("/users/profile", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  res.render("profile", { user });
});
//edit-profile
router.get("/users/edit-profile", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  res.render("edit-profile", { user });
});
//post edit profile
router.post("/users/edit-profile", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  user.fullname = req.body.fullname;
  user.phone = req.body.phone;
  await user.save();
  res.redirect("/users/profile");
});
//change-Password
router.get("/users/change-password", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  let error = req.flash("error");
  let success = req.flash("success");
  res.render("change-password", { user, error, success });
});
//post change-password and replace it with previous one and also check if current password is correct
router.post("/users/change-password", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  // Compare old password
  const isMatch = await bcrypt.compare(req.body.currentPassword, user.password);
  if (!isMatch) {
    req.flash("error", "Incorrect current password.");
    return res.redirect("/users/change-password");
  }
  // Hash new password and update
  const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
  user.password = hashedPassword;
  await user.save();
  req.flash("success", "Password updated successfully!");
  res.redirect("/users/change-password");
});

module.exports = router;
