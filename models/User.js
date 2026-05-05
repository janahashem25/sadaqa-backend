const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  full_name:     { type: String, required: true, trim: true },
  email:         { type: String, required: true, unique: true, lowercase: true },
  password_hash: { type: String, required: true },
  phone:         { type: String, default: "" },
  role:          { type: String, enum: ["supporter", "recipient", "admin"], default: "supporter" },
  city:          { type: String, default: "" },
  bio:           { type: String, default: "" },
  is_active:     { type: Boolean, default: true },
}, { timestamps: true });

// Hash password before save
userSchema.pre("save", async function () {
  if (!this.isModified("password_hash")) return;
  const salt = await bcrypt.genSalt(10);
  this.password_hash = await bcrypt.hash(this.password_hash, salt);
});

// Compare password
userSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password_hash);
};

module.exports = mongoose.model("User", userSchema);