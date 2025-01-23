const mongoose = require("mongoose");
const ownerSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: true,
    minlength: 3,
    trim: true,
  },
  email: String,
  password: String,
  gstin: String,
  picture: String,
  products: {
    type: Array,
    default: [],
  },
});

module.exports = mongoose.model("owner", ownerSchema);
