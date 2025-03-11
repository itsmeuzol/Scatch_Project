const express = require("express");
const router = express.Router();
const appointmentModel = require("../models/appointment-model");
const checkRole = require("../middlewares/checkRole");
const userModel = require("../models/user-model");
const prescriptionModel = require("../models/prescription-model");

// Doctor Dashboard Route
router.get("/doctor-dashboard", async (req, res) => {
  try {
    // Fetch upcoming appointments with patient details
    const appointments = await appointmentModel
      .find({ date: { $gte: new Date() } })
      .sort({ date: 1 }) // Sort by date (ascending)
      .populate("user", "fullname");

    // Fetch total number of patients
    const totalPatients = await userModel.countDocuments({ role: "user" });

    // Fetch appointments for today
    // Fetch appointments for today
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of the day
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // End of the day
    const appointmentsToday = await appointmentModel.countDocuments({
      date: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    // Fetch last login time (example: use a field in the User model)
    const doctor = await userModel.findOne({ _id: req.user._id });
    const lastLogin = doctor.lastLogin
      ? doctor.lastLogin.toLocaleString()
      : "N/A";

    // Render the dashboard with data
    res.render("doctor/doctor-dashboard", {
      appointments,
      totalPatients,
      appointmentsToday,
      lastLogin,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).send("Error loading dashboard.");
  }
});

// Route to view appointments
router.get("/doctor-appointments", checkRole(["admin"]), async (req, res) => {
  try {
    // Fetch appointments and populate user details
    let success = req.flash("success");
    const appointment = await appointmentModel
      .find()
      .populate("user", "fullname email phone");
    res.render("doctor/doctor-appointments", { appointment, success });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching appointments.");
  }
});

router.post("/accept-appointment/:id", async (req, res) => {
  try {
    const appointment = await appointmentModel.findById(req.params.id);
    if (!appointment) {
      return res.status(404).send("Appointment not found.");
    }

    // Here, you can update the appointment status or perform any other logic
    appointment.status = "Accepted"; // Example of marking appointment as accepted
    await appointment.save();

    // Redirect back to the appointments page
    res.redirect("/doctors/doctor-appointments");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error accepting appointment.");
  }
});

router.post("/delete-appointment/:id", async (req, res) => {
  try {
    const appointment = await appointmentModel.findByIdAndDelete(req.params.id);
    if (!appointment) {
      return res.status(404).send("Appointment not found.");
    }

    // Redirect back to the appointments page
    req.flash("success", "Appointment deleted successfully.");
    res.redirect("/doctor/doctor-appointments");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error deleting appointment.");
  }
});

// Render Add Prescription Page
router.get("/add-prescription/", async (req, res) => {
  let success = req.flash("success");
  try {
    // Fetch all appointments
    const appointments = await appointmentModel
      .find()
      .populate("user", "fullname");

    if (!appointments) {
      return res.status(404).send("Appointment not found.");
    }

    // Render the add prescription page
    res.render("doctor/add-prescription", { appointments, success });
  } catch (error) {
    console.error("Error fetching appointment details:", error);
    res.status(500).send("Error loading page.");
  }
});

// Handle Prescription Form Submission
router.post("/add-prescription", async (req, res) => {
  try {
    const { user, medication, dosage, instructions } = req.body;

    // Fetch the appointment
    const appointment = await appointmentModel.findOne({ user });

    if (!appointment) {
      return res.status(404).send("Appointment not found.");
    }

    // Create a new prescription
    const prescription = new prescriptionModel({
      appointment: appointment._id,
      user: appointment.user,
      doctor: req.user._id, // Assuming req.user contains the logged-in doctor's details
      medication,
      dosage,
      instructions,
    });

    // Save the prescription
    await prescription.save();
    req.flash("success", "Prescription added successfully.");

    // Redirect to a success page or back to the doctor's dashboard
    res.redirect("/doctor/add-prescription");
  } catch (error) {
    console.error("Error adding prescription:", error);
    res.status(500).send("Error adding prescription.");
  }
});

module.exports = router;
