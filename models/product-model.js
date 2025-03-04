const mongoose = require("mongoose");
const productSchema = new mongoose.Schema({
  image: Buffer,
  name: String,
  description: String,
  price: Number,
  quantity: String,
  discount: Number,
});

module.exports = mongoose.model("product", productSchema);
