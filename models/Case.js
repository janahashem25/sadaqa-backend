const mongoose = require("mongoose");

const caseSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  titleAr: {
    type: String,
    trim: true,
    default: "",
  },
  description: {
    type: String,
    required: true,
  },
  descriptionAr: {
    type: String,
    default: "",
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  goalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  image: {
    type: String,
    default: "",
  },
  gallery: [String], // Multiple images
  location: {
    city: String,
    country: String,
  },
  urgency: {
    type: String,
    enum: ["low", "medium", "high", "critical"],
    default: "medium",
  },
  showRequesterName: {
    type: Boolean,
    default: true,
  },
  status: {
    type: String,
    enum: ["pending", "active", "completed", "paused", "cancelled", "rejected", "archived"],
    default: "pending",
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  archived_reason: {
    type: String,
    default: "",
  },
  archived_at: {
    type: Date,
    default: null,
  },
  endDate: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field on save
caseSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for progress percentage
caseSchema.virtual("progressPercentage").get(function() {
  if (this.goalAmount === 0) return 0;
  return ((this.currentAmount / this.goalAmount) * 100).toFixed(2);
});

// Ensure virtuals are included in JSON output
caseSchema.set("toJSON", { virtuals: true });
caseSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Case", caseSchema);
