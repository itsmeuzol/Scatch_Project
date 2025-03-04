const express = require("express");
const router = express.Router();
const ownerModel = require("../models/owner-model");
const userModel = require("../models/user-model");
const appointmentModel = require("../models/appointment-model");
const checkRole = require("../middlewares/checkRole");

router.get("/create", (req, res) => {
  res.send("Hey its working!!");
});

router.post("/create", async (req, res) => {
  let owners = await ownerModel.find();
  if (owners.length > 0) {
    return res
      .status(503)
      .send("You don't have permission to create new owner.");
  }
  let { fullname, email, password } = req.body;

  const createdOwner = new ownerModel({
    fullname,
    email,
    password,
  });

  await createdOwner.save();
  return res.status(201).send(createdOwner);
});

router.get("/admin", (req, res) => {
  let success = req.flash("success");
  res.render("createMedicine", { success });
});

module.exports = router;
