const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const Category = require("./models/Category");
const defaultCategories = require("./defaultCategories");

dotenv.config();

const app = express();

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

app.use("/api/auth", require("./routes/auth"));
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
    message: "Something went wrong!",
  });
});

const PORT = process.env.PORT || 5000;

const ensureDefaultCategories = async () => {
  try {
    for (const category of defaultCategories) {
      await Category.findOneAndUpdate(
        { slug: category.slug },
        {
          $setOnInsert: {
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

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected successfully");
     console.log("Mongo connected to:");
  console.log("Host:", mongoose.connection.host);
  console.log("DB:", mongoose.connection.name);
    await ensureDefaultCategories();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });
