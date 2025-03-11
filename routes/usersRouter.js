const express = require("express");
const router = express.Router();
const userModel = require("../models/user-model");
const appointmentModel = require("../models/appointment-model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookie = require("cookie-parser");
const isLoggedIn = require("../middlewares/isLoggedIn");
const { verifyOTP, sendOTPEmail } = require("../utils/emailService");
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
const prescriptionModel = require("../models/prescription-model");
const cartModel = require("../models/cart-model");

//register
router.get("/register", (req, res) => {
  res.render("register");
});

router.post("/register", registerUser);

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
//addtocart

// router.get("/addtocart/:id", isLoggedIn, async (req, res) => {
//   let user = await userModel.findOne({ email: req.user.email });
//   user.cart.push(req.params.id);
//   await user.save();
//   req.flash("success", "Product added to cart");
//   res.redirect("/");
// });

// Add product to cart or update quantity if it already exists
router.post("/addtocart/:productId", isLoggedIn, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id; // Get logged-in user's ID
    const quantityToAdd = parseInt(req.body.quantity) || 1;

    // Check if the product already exists in the user's cart
    let cartItem = await cartModel.findOne({ userId, productId });

    if (cartItem) {
      // If exists, update quantity instead of adding a duplicate
      cartItem.quantity += quantityToAdd;
      await cartItem.save();
    } else {
      // If not exists, create a new cart entry
      await cartModel.create({ userId, productId, quantity: quantityToAdd });
    }

    req.flash("success", "Item added to cart successfully!");
    res.redirect("/");
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.redirect("/users/cart");
  }
});

//this will show added cart items in page
router.get("/cart", isLoggedIn, async (req, res) => {
  try {
    let success = req.flash("success");

    // Populate cart items along with their quantities
    let cartItems = await cartModel
      .find({ userId: req.user._id })
      .populate("productId");

    res.render("cart", { success, cartItems });
  } catch (error) {
    console.error("Error fetching cart items:", error);
    res.redirect("/");
  }
});

//delete cart item
router.post("/cart/delete/:cartItemId", isLoggedIn, async (req, res) => {
  try {
    // Delete the cart item using its _id
    await cartModel.findOneAndDelete({
      _id: req.params.cartItemId,
      userId: req.user._id,
    });

    req.flash("success", "Product removed from cart");
    res.redirect("/users/cart");
  } catch (error) {
    console.error("Error deleting cart item:", error);
    req.flash("error", "Failed to remove item from cart");
    res.redirect("/users/cart");
  }
});

// Checkout Page Route
router.get("/checkout", isLoggedIn, async (req, res) => {
  try {
    // Find all cart items for the logged-in user
    const cartItems = await cartModel
      .find({ userId: req.user._id })
      .populate("productId");

    if (!cartItems.length) {
      req.flash("error", "Your cart is empty!");
      return res.redirect("/users/cart");
    }

    // Map cart items to include required details
    const items = cartItems.map((cartItem) => {
      const discount = cartItem.productId.discount || 0;
      const price = cartItem.productId.price;
      const discountedPrice = price - (price * discount) / 100;
      return {
        _id: cartItem._id,
        name: cartItem.productId.name,
        discount,
        price,
        discountedPrice,
        quantity: cartItem.quantity,
      };
    });

    // Calculate subtotal
    const subtotal = items.reduce(
      (total, cartItem) => total + cartItem.discountedPrice * cartItem.quantity,
      0
    );

    // Example discount logic (replace with actual discount logic)
    const discountApplied = false; // Change based on actual discount criteria
    const totalPriceAfterDiscount = discountApplied ? subtotal * 0.9 : subtotal; // 10% discount if applied

    res.render("checkout", {
      items,
      subtotal,
      discountApplied,
      totalPriceAfterDiscount,
    });
  } catch (error) {
    console.error("Error fetching cart items:", error);
    req.flash("error", "Error fetching cart items.");
    res.redirect("/users/cart"); // Redirect back to the cart page in case of an error
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

// Render View Prescription Page
router.get("/view-prescription", isLoggedIn, async (req, res) => {
  try {
    const userId = req.user._id; // Assuming req.user contains the logged-in user's details

    // Fetch the prescription details and ensure it belongs to the logged-in user
    const prescription = await prescriptionModel
      .find({ user: userId })
      .populate("doctor appointment", "fullname phone service");

    if (!prescription || prescription.length === 0) {
      return res.status(404).send("No prescriptions found for this user.");
    }

    // Render the view prescription page
    res.render("view-prescription", { prescription });
  } catch (error) {
    console.error("Error fetching prescription details:", error);
    res.status(500).send("Error loading page.");
  }
});

module.exports = router;
