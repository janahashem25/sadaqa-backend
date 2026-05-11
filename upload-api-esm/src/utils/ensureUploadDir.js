import fs from "fs";
import path from "path";

export const uploadsDir = path.resolve("uploads");

export function ensureUploadDir() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}
