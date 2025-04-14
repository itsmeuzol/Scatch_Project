const express = require("express");
const router = express.Router();
const Appointment = require("../models/appointment-model");
const isLoggedIn = require("../middlewares/isLoggedIn");
const Prescription = require("../models/prescription-model");
const Vaccine = require("../models/vaccine-model");
const User = require("../models/user-model");
const Message = require("../models/contact-model");

router.get("/staff-dashboard", isLoggedIn, async (req, res) => {
  try {
    // Get today's date at midnight to filter today's appointments
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Fetch today's appointments
    const todaysAppointments = await Appointment.find({
      date: { $gte: todayStart, $lte: todayEnd },
    })
      .sort({ time: 1 })
      .populate("user")
      .limit(10);

    // Fetch pending appointments
    const pendingAppointmentsCount = await Appointment.countDocuments({
      status: "Pending",
    });

    // Fetch new messages
    const newMessages = await Message.find().sort({ createdAt: -1 }); // Fetch all messages sorted by date (newest first)
    const newMessagesCount = newMessages.length; // Count the messages

    // Fetch vaccine records (users who have been issued a vaccine)
    const vaccineRecords = await Vaccine.find({ issued: true })
      .populate("user")
      .sort({ issuedDate: -1 });

    // Fetch recent prescriptions
    const recentPrescriptions = await Prescription.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("user doctor");

    res.render("staff/staff-dashboard", {
      staff: req.user,
      todaysAppointments,
      pendingAppointmentsCount,
      newMessagesCount,
      newMessages,
      vaccineRecords,
      recentPrescriptions,
      lastLogin: req.user.lastLogin
        ? new Date(req.user.lastLogin).toLocaleString()
        : "First login",
    });
  } catch (err) {
    console.error("Error loading staff dashboard:", err);
    res.status(500).send("Server Error");
  }
});

// Add New Vaccine
router.post("/add-vaccine", isLoggedIn, async (req, res) => {
  const { name, description, availableSlots, hospital } = req.body;
  try {
    await Vaccine.create({
      name,
      description,
      availableSlots,
      hospital,
    });
    res.redirect("/users/vaccines");
  } catch (err) {
    console.error("Error adding vaccine:", err);
    res.status(500).send("Something went wrong");
  }
});

module.exports = router;
