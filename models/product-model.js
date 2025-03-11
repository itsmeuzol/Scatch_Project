const mongoose = require("mongoose");
const productSchema = new mongoose.Schema({
  image: Buffer,
  name: String,
  description: String,
  price: Number,
  discount: Number,
});

module.exports = mongoose.model("product", productSchema);
