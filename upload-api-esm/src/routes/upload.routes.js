import express from "express";
import { uploadImage } from "../config/multer.js";
import { env } from "../config/env.js";
import cloudinary, { isCloudinaryConfigured } from "../config/cloudinary.js";
import { removeFile } from "../utils/fileCleanup.js";

const router = express.Router();

router.post("/upload", uploadImage, async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error("Image file is required");
      error.statusCode = 400;
      throw error;
    }

    return res.status(200).json({
      success: true,
      imageUrl: `/uploads/${req.file.filename}`,
      imageFullUrl: `${env.baseUrl}/uploads/${req.file.filename}`,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/upload/cloudinary", uploadImage, async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error("Image file is required");
      error.statusCode = 400;
      throw error;
    }

    if (!isCloudinaryConfigured()) {
      const error = new Error("Cloudinary is not configured");
      error.statusCode = 500;
      throw error;
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "uploads",
      resource_type: "image",
    });

    await removeFile(req.file.path);

    return res.status(200).json({
      success: true,
      imageUrl: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
