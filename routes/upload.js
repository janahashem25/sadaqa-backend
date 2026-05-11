const express = require("express");
const fs = require("fs/promises");
const multer = require("multer");
const { uploadSingleImage } = require("../config/localUpload");

const router = express.Router();

async function cleanupUploadedFile(filePath) {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch {
    // Best-effort cleanup only.
  }
}

function handleUpload(req, res, next) {
  uploadSingleImage(req, res, async (err) => {
    if (!err) {
      next();
      return;
    }

    await cleanupUploadedFile(req.file?.path);

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({
          success: false,
          message: "Image must be 5MB or less",
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: err.message,
      });
      return;
    }

    res.status(err.statusCode || 400).json({
      success: false,
      message: err.message || "Upload failed",
    });
  });
}

router.post("/", handleUpload, (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Image file is required",
    });
  }

  const imageUrl = `/uploads/${req.file.filename}`;
  const imageFullUrl = `${req.protocol}://${req.get("host")}${imageUrl}`;

  return res.status(200).json({
    success: true,
    imageUrl,
    imageFullUrl,
  });
});

module.exports = router;
