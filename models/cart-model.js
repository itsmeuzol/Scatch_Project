const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "product",
    required: true,
  },
  quantity: { type: Number, default: 1 },
});

// Ensure a user cannot add the same product multiple times (instead, it updates quantity)
cartSchema.index({ userId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model("cart", cartSchema);
