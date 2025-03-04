const express = require("express");
const router = express.Router();
const userModel = require("../models/user-model");
const appointmentModel = require("../models/appointment-model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookie = require("cookie-parser");
const isLoggedIn = require("../middlewares/isLoggedIn");
const { verifyOTP } = require("../utils/emailService");
const { generateToken } = require("../utils/generateToken");
const {
  checkExistingAppointment,
  checkAppointmentLimit,
  convertTo12HourFormat,
} = require("../utils/appointmentHelpers");
const {
  registerUser,
  loginUser,
  logout,
} = require("../controllers/authController");
const productModel = require("../models/product-model");

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
    res.redirect("/login");
  }
});

//login
router.post("/login", loginUser);

router.get("/logout", logout);

// My appointments of user
router.get("/myappointments", isLoggedIn, async (req, res) => {
  let success = req.flash("success");
  try {
    if (!req.user) {
      return res.redirect("/register");
    }

    // Fetch the user
    const user = await userModel.findOne({ email: req.user.email });
    // Fetch the user's appointments
    const appointments = await appointmentModel
      .find({ user: user._id })
      .populate("user", "fullname email phone");

    // Render the myappointments view with the user's appointments
    res.render("myappointments", { appointments, success });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).send("Internal Server Error");
  }
});
//delete appointment
router.post("/myappointments/delete/:id", async (req, res) => {
  try {
    const appointmentId = req.params.id;
    await appointmentModel.findByIdAndDelete(appointmentId);
    req.flash("success", "Appointment deleted successfully!");
    res.redirect("/users/myappointments");
  } catch (error) {
    console.error("Error deleting appointment:", error);
    res.status(500).send("Internal Server Error");
  }
});

/* PROFILE PART */
//profile
router.get("/profile", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  let success = req.flash("success");
  res.render("profile", { user, success });
});

//edit-profile
router.get("/edit-profile", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  res.render("edit-profile", { user });
});

//post edit profile
router.post("/edit-profile", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  user.fullname = req.body.fullname;
  user.phone = req.body.phone;
  user.address = req.body.address;
  user.age = req.body.age;
  await user.save();
  req.flash("success", "Profile updated successfully!");
  res.redirect("/users/profile");
});

/* ---------------This is a change password part where
user can change the password------------------*/
//change-Password
router.get("/change-password", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  let error = req.flash("error");
  let success = req.flash("success");
  res.render("change-password", { user, error, success });
});
//post change-password and replace it with previous one and also check if current password is correct
router.post("/change-password", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  // Compare old password
  const isMatch = await bcrypt.compare(req.body.currentPassword, user.password);
  if (!isMatch) {
    req.flash("error", "Incorrect current password.");
    return res.redirect("/change-password");
  }
  // Hash new password and update
  const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
  user.password = hashedPassword;
  await user.save();
  req.flash("success", "Password updated successfully!");
  res.redirect("/change-password");
});

/* ------------This is a appointment part------------------------- */
// Appointment Part
router.get("/appointment", isLoggedIn, (req, res) => {
  let success = req.flash("success");
  let error = req.flash("error");
  if (!req.user) {
    return res.redirect("/login");
  }
  res.render("appointment", { success, error });
});

// Post-appointment
router.post("/book-appointment", async (req, res) => {
  try {
    // Fetch the user details using the userId from the session
    const user = await userModel.findOne({ email: req.user.email });
    if (!user) {
      req.flash("error", "User not found.");
      return res.redirect("/users/appointment");
    }

    const { date, time, service } = req.body;
    const formattedTime = convertTo12HourFormat(time);

    // Check if the user already has an appointment for the same service at the same time
    const existingAppointment = await checkExistingAppointment(
      user._id,
      service,
      formattedTime,
      appointmentModel
    );
    if (existingAppointment) {
      req.flash(
        "error",
        "You already have an appointment for this service at the same time."
      );
      return res.redirect("/users/appointment");
    }

    // Check if the user has already made 4 appointments
    if (await checkAppointmentLimit(user._id, appointmentModel)) {
      req.flash("error", "You can only make 4 appointments.");
      return res.redirect("/users/appointment");
    }

    // Save the appointment to the database, associating the full user object
    const appointment = new appointmentModel({
      date,
      time: formattedTime, // Store in 12-hour format
      service,
      user: user._id, // Assign the user ObjectId
    });

    await appointment.save();

    // Redirect or render a success page
    req.flash("success", "Appointment booked successfully!");
    res.redirect("/users/appointment");
  } catch (error) {
    console.error(error);
    req.flash("error", "Error booking appointment.");
    res.redirect("/users/appointment");
  }
});
//user dashboard
router.get("/user-dashboard", async (req, res) => {
  try {
    // Fetch the logged-in user's data
    const user = req.user; // Assuming req.user is populated by your authentication middleware

    // Fetch upcoming appointments for the user
    const appointments = await appointmentModel
      .find({
        user: user._id,
        date: { $gte: new Date() },
      })
      .sort({ date: 1 }) // Sort by date (ascending)
      .exec();

    // Render the dashboard with data
    res.render("user-dashboard", {
      user,
      appointments,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).send("Error loading dashboard.");
  }
});

/** Thi is addtocart part */

router.get("/addtocart/:id", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  user.cart.push(req.params.id);
  await user.save();
  req.flash("success", "Product added to cart");
  res.redirect("/");
});

//addtocart
router.get("/cart", isLoggedIn, async (req, res) => {
  try {
    let success = req.flash("success"); // Get flash message
    let user = await userModel
      .findOne({ email: req.user.email })
      .populate("cart");
    res.render("cart", { success, user });
  } catch (error) {
    console.error("Error fetching item details:", error);
  }
});
//delete cart item
router.post("/cart/delete/:medicine_id", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  let index = user.cart.indexOf(req.params.medicine_id);
  user.cart.splice(index, 1);
  await user.save();
  req.flash("success", "Product removed from cart");
  res.redirect("/users/cart");
});

// Checkout Page Route
router.get("/checkout", isLoggedIn, async (req, res) => {
  try {
    const user = await userModel
      .findOne({ email: req.user.email })
      .populate("cart");

    const items = user.cart.map((cartItem) => ({
      _id: cartItem._id,
      name: cartItem.name,
      price: cartItem.price,
      quantity: cartItem.quantity,
    }));

    // Calculate subtotal
    const subtotal = items.reduce(
      (total, cartItem) => total + cartItem.price * cartItem.quantity,
      0
    );

    // Example discount logic (replace with your actual discount logic)
    const discountApplied = false; // Set to true if a discount is applied
    const totalPriceAfterDiscount = discountApplied ? subtotal * 0.9 : subtotal; // 10% discount

    res.render("checkout", {
      items,
      subtotal,
      discountApplied,
      totalPriceAfterDiscount,
    });
  } catch (error) {
    console.error("Error fetching cart items:", error);
    req.flash("error", "Error fetching cart items.");
    res.redirect("/some-error-page"); // Redirect to an error page or handle accordingly
  }
});

// Apply Discount Route
router.post("/apply-discount", (req, res) => {
  const { discountCode } = req.body;

  // Add your discount validation logic here
  if (discountCode === "DISCOUNT10") {
    // Apply a 10% discount
    res.redirect("/checkout?discount=10");
  } else {
    res.redirect("/checkout?error=Invalid discount code");
  }
});

// Process Payment Route
router.post("/process-payment", (req, res) => {
  const { cardNumber, expiryDate, cvv, cardName } = req.body;

  // Add your payment processing logic here
  console.log("Payment Details:", { cardNumber, expiryDate, cvv, cardName });

  // Redirect to a success page
  res.redirect("/payment-success");
});

module.exports = router;
