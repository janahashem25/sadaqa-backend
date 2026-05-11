import fs from "fs/promises";

export async function removeFile(filePath) {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch {
    // Best-effort cleanup.
  }
}
