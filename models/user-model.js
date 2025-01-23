const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: true,
    minlength: 3,
    trim: true,
  },
  email: String,
  password: String,
  isAdmin: Boolean,
  contact: Number,
  orders: {
    items: Array,
    default: [],
  },
  cart: {
    items: Array,
    default: [],
  },
  picture: String,
});

module.exports = mongoose.model("user", userSchema);
