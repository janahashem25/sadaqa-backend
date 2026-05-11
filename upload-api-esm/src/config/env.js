import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 5000),
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
};
