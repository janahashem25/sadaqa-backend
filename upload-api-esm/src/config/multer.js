import multer from "multer";
import path from "path";
import { ensureUploadDir, uploadsDir } from "../utils/ensureUploadDir.js";

ensureUploadDir();

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function createFilename(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now()}-${random}${ext}`;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    cb(null, createFilename(file));
  },
});

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = allowedMimeTypes.has(file.mimetype);
  const extOk = allowedExtensions.has(ext);

  if (!mimeOk || !extOk) {
    const error = new Error("Only jpg, jpeg, png, and webp image files are allowed");
    error.statusCode = 400;
    cb(error, false);
    return;
  }

  cb(null, true);
}

const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

export const uploadImage = multerUpload.single("image");
