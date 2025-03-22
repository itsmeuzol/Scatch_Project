const express = require("express");
const router = express.Router();
const userModel = require("../models/user-model");
const appointmentModel = require("../models/appointment-model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookie = require("cookie-parser");
const isLoggedIn = require("../middlewares/isLoggedIn");
const upload = require("../config/multer-config");
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
const vaccineModel = require("../models/vaccine-model");
const bookingModel = require("../models/booking-model");

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

//upload avatar
router.post("/upload-avatar", upload.single("avatar"), async (req, res) => {
  try {
    const userId = req.user._id; // Assuming you have user authentication
    const avatar = req.file.buffer;

    // Find the user and update the avatar
    const user = await userModel.findById(userId);
    if (!user) {
      req.flash("error", "User not found.");
      return res.redirect("/users/profile");
    }

    user.avatar = avatar;
    await user.save();

    req.flash("success", "Avatar updated successfully.");
    res.redirect("/users/profile");
  } catch (error) {
    console.error("Error uploading avatar:", error);
    req.flash("error", "An error occurred while uploading the avatar.");
    res.redirect("/users/profile");
  }
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
  res.render("appointment", { success, error, user: req.user });
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

    res.render("cart", { success, cartItems, user: req.user });
  } catch (error) {
    console.error("Error fetching cart items:", error);
    res.redirect("/");
  }
});

//delete cart item
router.post("/cart/delete/:cartItemId", isLoggedIn, async (req, res) => {
  try {
    // Find the cart item using its _id and the user's _id
    const cartItem = await cartModel.findOne({
      _id: req.params.cartItemId,
      userId: req.user._id,
    });

    if (!cartItem) {
      req.flash("error", "Cart item not found.");
      return res.redirect("/users/cart");
    }

    // Decrease the quantity or remove the item if the quantity is 1

    await cartModel.findOneAndDelete({
      _id: req.params.cartItemId,
      userId: req.user._id,
    });
    req.flash("success", "Product removed from cart.");

    res.redirect("/users/cart");
  } catch (error) {
    console.error("Error deleting cart item:", error);
    req.flash("error", "Failed to remove item from cart.");
    res.redirect("/users/cart");
  }
});
//update quantity whenever user click tick and set new quantity
router.post("/cart/updateQuantity/:itemId", async (req, res) => {
  try {
    const itemId = req.params.itemId;
    const { quantity } = req.body;

    // Find the cart item and update the quantity
    const cartItem = await cartModel.findById(itemId);
    if (!cartItem) {
      req.flash("error", "Cart item not found.");
      return res.redirect("/users/cart"); // Redirect to cart page
    }

    cartItem.quantity = quantity;
    await cartItem.save();

    req.flash("success", "Quantity updated successfully.");
    res.redirect("/users/cart"); // Redirect back to cart after updating
  } catch (error) {
    console.error("Error updating quantity:", error);
    req.flash("error", "An error occurred while updating the quantity.");
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

//vaccine part//......
// Render Vaccines Page
router.get("/vaccines", async (req, res) => {
  try {
    // Fetch all available vaccines
    const vaccines = await vaccineModel.find({ availableSlots: { $gt: 0 } });

    // Render the vaccines page
    res.render("vaccines", { vaccines });
  } catch (error) {
    console.error("Error fetching vaccines:", error);
    res.status(500).send("Error loading vaccines.");
  }
});

// Render Book Vaccine Page
router.get("/book-vaccine/:vaccineId", async (req, res) => {
  try {
    const vaccineId = req.params.vaccineId;

    // Fetch the vaccine details
    const vaccine = await vaccineModel.findById(vaccineId);

    if (!vaccine) {
      return res.status(404).send("Vaccine not found.");
    }

    // Render the book vaccine page
    res.render("book-vaccine", { vaccine });
  } catch (error) {
    console.error("Error fetching vaccine details:", error);
    res.status(500).send("Error loading page.");
  }
});

// Handle Vaccine Booking
router.post("/book-vaccine/:vaccineId", async (req, res) => {
  try {
    const vaccineId = req.params.vaccineId;
    const userId = req.user._id; // Assuming req.user contains the logged-in user's details

    // Fetch the vaccine
    const vaccine = await vaccineModel.findById(vaccineId);

    if (!vaccine) {
      return res.status(404).send("Vaccine not found.");
    }

    // Check if slots are available
    if (vaccine.availableSlots <= 0) {
      return res.status(400).send("No slots available for this vaccine.");
    }

    // Generate a unique ticket ID
    const ticketId = `TICKET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Create a new booking
    const newBooking = new bookingModel({
      user: userId,
      vaccine: vaccineId,
      ticketId,
    });

    // Save the booking
    await newBooking.save();

    // Decrease the available slots for the vaccine
    vaccine.availableSlots -= 1;
    await vaccine.save();

    // Redirect to the ticket page
    res.redirect(`/users/vaccine-ticket/${newBooking._id}`);
  } catch (error) {
    console.error("Error booking vaccine:", error);
    res.status(500).send("Error booking vaccine.");
  }
});

// Render Vaccine Ticket Page
router.get("/vaccine-ticket/:bookingId", async (req, res) => {
  try {
    const bookingId = req.params.bookingId;

    // Fetch the booking details and populate the vaccine and user details
    const booking = await bookingModel
      .findById(bookingId)
      .populate("user", "fullname email")
      .populate("vaccine", "name hospital");

    if (!booking) {
      return res.status(404).send("Booking not found.");
    }

    // Render the ticket page
    res.render("vaccine-ticket", { booking });
  } catch (error) {
    console.error("Error fetching booking details:", error);
    res.status(500).send("Error loading ticket.");
  }
});

module.exports = router;
