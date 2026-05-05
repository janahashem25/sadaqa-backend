const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  nameAr: {
    type: String,
    trim: true,
    default: "",
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  description: {
    type: String,
    default: "",
  },
  descriptionAr: {
    type: String,
    default: "",
  },
  icon: {
    type: String, // URL or icon class
    default: "",
  },
  emoji: {
    type: String,
    default: "",
  },
  image: {
    type: String, // Category cover image
    default: "",
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  order: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

categorySchema.virtual("is_active")
  .get(function getIsActive() {
    return this.isActive;
  })
  .set(function setIsActive(value) {
    this.isActive = value;
  });

categorySchema.set("toJSON", { virtuals: true });
categorySchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Category", categorySchema);
