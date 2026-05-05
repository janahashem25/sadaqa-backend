const mongoose = require("mongoose");

const homeConfigSchema = new mongoose.Schema({
  banner: {
    title: String,
    titleAr: String,
    subtitle: String,
    subtitleAr: String,
    image: String,
    buttonText: String,
    buttonTextAr: String,
    buttonLink: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  stats: {
    totalDonors: {
      type: Number,
      default: 0,
    },
    totalCases: {
      type: Number,
      default: 0,
    },
    totalRaised: {
      type: Number,
      default: 0,
    },
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("HomeConfig", homeConfigSchema);