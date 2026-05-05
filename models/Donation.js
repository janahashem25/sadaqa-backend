const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema({
  case_id:        { type: mongoose.Schema.Types.ObjectId, ref: "Case", required: true },
  donor_id:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount:         { type: Number, required: true, min: 1 },
  payment_method: { type: String, enum: ["credit", "bank", "cash"], required: true },
  message:        { type: String, default: "" },
  is_anonymous:   { type: Boolean, default: false },
  status:         { type: String, enum: ["pending", "completed", "failed"], default: "completed" },
}, { timestamps: true });

module.exports = mongoose.model("Donation", donationSchema);