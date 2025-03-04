const express = require("express");
const router = express.Router();
const productModel = require("../models/product-model");
const upload = require("../config/multer-config");

router.get("/", (req, res) => {
  res.send("Hey its working!!");
});

//post
router.post("/medicines/add", upload.single("image"), async (req, res) => {
  try {
    let { image, name, description, price, quantity, discount } = req.body;
    let product = await productModel.create({
      image: req.file.buffer,
      name,
      price,
      quantity,
      discount,
      description,
    });
    await product.save();
    req.flash("success", "Medicine created successfully");
    res.redirect("/owners/admin");
  } catch (err) {
    res.send(err.message);
  }
});

module.exports = router;
