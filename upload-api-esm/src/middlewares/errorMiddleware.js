import multer from "multer";
import { removeFile } from "../utils/fileCleanup.js";

export async function errorMiddleware(err, req, res, _next) {
  if (req.file?.path) {
    await removeFile(req.file.path);
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Image must be 5MB or less",
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
  });
}
