const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadsDir = path.resolve(__dirname, "..", "uploads");

function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

ensureUploadsDir();

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function generateFilename(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}-${random}${extension}`;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    cb(null, generateFilename(file));
  },
});

function fileFilter(_req, file, cb) {
  const extension = path.extname(file.originalname).toLowerCase();
  const mimeOk = allowedMimeTypes.has(file.mimetype);
  const extensionOk = allowedExtensions.has(extension);

  if (!mimeOk || !extensionOk) {
    const error = new Error("Only jpg, jpeg, png, and webp image files are allowed");
    error.statusCode = 400;
    cb(error, false);
    return;
  }

  cb(null, true);
}

const localUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

module.exports = {
  uploadsDir,
  ensureUploadsDir,
  uploadSingleImage: localUpload.single("image"),
};
