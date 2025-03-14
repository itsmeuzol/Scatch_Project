const express = require("express");
const router = express.Router();
const ownerModel = require("../models/owner-model");
const userModel = require("../models/user-model");
const appointmentModel = require("../models/appointment-model");
const checkRole = require("../middlewares/checkRole");
const productModel = require("../models/product-model");
const upload = require("../config/multer-config");

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

//post medicine
router.post("/createMedicine", async (req, res) => {
  let { name, price, quantity, description } = req.body;
  const createdMedicine = new productModel({
    name,
    price,
    quantity,
    description,
  });
  await createdMedicine.save();
  req.flash("success", "Medicine Added Successfully!");
  res.redirect("/admin");
});

// Render Edit Medicine Page
router.get("/edit/:productId", async (req, res) => {
  try {
    const productId = req.params.productId;

    // Fetch the medicine details
    const product = await productModel.findById(productId);

    if (!product) {
      return res.status(404).send("Medicine not found.");
    }

    // Render the edit medicine page
    res.render("edit-medicine", { product, success: "" });
  } catch (error) {
    console.error("Error fetching medicine details:", error);
    res.status(500).send("Error loading page.");
  }
});

// Handle Edit Medicine Form Submission
router.post("/edit/:productId", upload.single("image"), async (req, res) => {
  try {
    const { name, price, description } = req.body;
    const productId = req.params.productId;

    // Fetch the medicine
    const product = await productModel.findById(productId);

    if (!product) {
      req.flash("error", "Medicine not found.");
      return res.redirect("/owners/edit/" + productId);
    }

    // Update the medicine details
    product.name = name;
    product.price = price;
    product.description = description;

    // Handle image upload (if a new image is provided)
    if (req.file) {
      product.image = req.file.buffer; // Assuming you're using a file upload middleware like Multer
    }

    // Save the updated medicine
    await product.save();

    // Set the success flash message and redirect to the edit page
    req.flash("success", "Medicine updated successfully!");
    res.redirect("/");
  } catch (error) {
    console.error("Error updating medicine:", error);
    req.flash("error", "Error updating medicine.");
    res.redirect("/owners/edit/" + req.params.productId);
  }
});

module.exports = router;
