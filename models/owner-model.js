const mongoose = require("mongoose");
const ownerSchema = new mongoose.Schema({
  fullname: {
    type: String,
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
