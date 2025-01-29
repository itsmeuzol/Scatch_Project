const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  fullname: {
    type: String,
    minlength: 3,
    trim: true,
  },
  email: String,
  password: String,
  isAdmin: Boolean,
  contact: Number,
  orders: {
    item: Array,
    default: [],
  },
  cart: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product", // Corrected `ref` usag
    },
  ],
  picture: String,
});

module.exports = mongoose.model("user", userSchema);
