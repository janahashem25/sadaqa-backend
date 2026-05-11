import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";
import uploadRoutes from "./routes/upload.routes.js";
import { notFound } from "./middlewares/notFound.js";
import { errorMiddleware } from "./middlewares/errorMiddleware.js";
import { ensureUploadDir } from "./utils/ensureUploadDir.js";

ensureUploadDir();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));
app.use("/api", uploadRoutes);

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Image upload API is running",
  });
});

app.use(notFound);
app.use(errorMiddleware);

app.listen(env.port, () => {
  console.log(`Server running on ${env.baseUrl}`);
});
