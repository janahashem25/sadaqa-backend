const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) return res.status(401).json({ message: "Not authorized" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password_hash");
    if (!user) {
      return res.status(401).json({ message: "Token invalid or user not found" });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token invalid" });
  }
};

exports.adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") return res.status(403).json({ message: "Admins only" });
  next();
};