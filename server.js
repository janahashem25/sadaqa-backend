const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const Category = require("./models/Category");
const defaultCategories = require("./defaultCategories");
const { verifyCloudinaryConfig, pingCloudinary } = require("./config/cloudinary");
const { verifyMailerConfig } = require("./config/mailer");
const { ensureUploadsDir } = require("./config/localUpload");

dotenv.config();

const app = express();
ensureUploadsDir();

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5174",
  "https://sadaqa-frontend.onrender.com",
  "https://sadaqa-nine.vercel.app"
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isExplicitlyAllowed = allowedOrigins.includes(origin);
      const isLocalViteOrigin = /^http:\/\/localhost:51\d{2}$/.test(origin);

      if (isExplicitlyAllowed || isLocalViteOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use("/uploads", express.static(path.resolve(__dirname, "uploads")));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/cases", require("./routes/cases"));
app.use("/api/donations", require("./routes/donations"));
app.use("/api/item-donations", require("./routes/itemDonations"));
app.use("/api/users", require("./routes/users"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/home", require("./routes/home"));
app.use("/api/categories", require("./routes/category"));

app.get("/", (req, res) => res.json({ message: "Sadaqa API is running!" }));
app.get("/health", (req, res) =>
  res.json({ status: "OK", timestamp: new Date() })
);

// ── Cloudinary debug endpoint ────────────────────────────────────────────────
// GET /debug/cloudinary
// Runs a live authenticated ping to Cloudinary and returns the result.
// Remove or protect this route before going to production if needed.
app.get("/debug/cloudinary", async (req, res) => {
  const { cloud_name, api_key, api_secret } = require("./config/cloudinary").cloudinary.config
    ? require("./config/cloudinary").cloudinary.config()
    : {};

  const configPresent = {
    CLOUDINARY_CLOUD_NAME: !!cloud_name,
    CLOUDINARY_API_KEY:    !!api_key,
    CLOUDINARY_API_SECRET: !!api_secret,
  };

  const ping = await pingCloudinary();

  res.status(ping.ok ? 200 : 503).json({
    configPresent,          // which env vars are loaded (values hidden)
    cloud: ping.cloud,      // cloud name is safe to display
    connected: ping.ok,
    status: ping.status,
    latencyMs: ping.latencyMs,
    ...(ping.error ? { error: ping.error } : {}),
    checkedAt: new Date().toISOString(),
  });
});
// ────────────────────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
  });
});

app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    message: err?.message || "Something went wrong!",
    ...(process.env.NODE_ENV !== "production" && err?.stack ? { stack: err.stack } : {}),
  });
});

const PORT = process.env.PORT || 5001;

const ensureDefaultCategories = async () => {
  try {
    for (const category of defaultCategories) {
      await Category.findOneAndUpdate(
        {
          $or: [{ slug: category.slug }, { name: category.name }],
        },
        {
          $set: {
            ...category,
            nameAr: category.name,
            descriptionAr: category.description,
            image: "",
          },
        },
        { upsert: true, new: true }
      );
    }

    console.log("Default categories ensured");
  } catch (error) {
    console.error("Failed to ensure default categories:", error.message);
  }
};

// ── Cloudinary + Mailer connectivity checks (runs immediately, independent of DB) ──────
verifyCloudinaryConfig();   // fast env-var check (no network)
verifyMailerConfig();       // verify SMTP transport if configured
pingCloudinary();           // live API ping (async, non-blocking)
// ─────────────────────────────────────────────────────────────────────────────

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected successfully");
    console.log("Host:", mongoose.connection.host);
    console.log("DB:  ", mongoose.connection.name);

    await ensureDefaultCategories();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });
