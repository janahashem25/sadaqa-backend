const mongoose = require("mongoose");

const itemDonationSchema = new mongoose.Schema(
  {
    donor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    itemType: {
      type: String,
      default: "",
      trim: true,
    },
    condition: {
      type: String,
      enum: ["new", "like-new", "good", "fair"],
      default: "good",
    },
    quantity: {
      type: Number,
      min: 1,
      default: 1,
    },
    image: {
      type: String,
      default: "",
      trim: true,
    },
    location: {
      city: { type: String, default: "" },
      country: { type: String, default: "Lebanon" },
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    contactPhone: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "available", "reserved", "donated", "rejected", "archived"],
      default: "pending",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ItemDonation", itemDonationSchema);
