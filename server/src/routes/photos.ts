import { Router, Request, Response } from "express";
import { createReadStream } from "fs";
import { extname, resolve } from "path";
import { requireApiKey } from "../middleware/auth.js";
import {
  savePhotoFromBase64,
  saveAttachmentFromBase64,
  deletePhoto,
  photoExists,
  listRecentPhotos,
  resolvePhotoPath,
  getObsidianEmbed,
  getObsidianWikilink,
} from "../services/photoHandler.js";
import { getConfig } from "../utils/config.js";
import { env } from "../env.js";
import { logger } from "../utils/logger.js";
import { statSync } from "fs";

const router = Router();
const PHOTO_MIME_TYPES: Record<string, string> = {
  ".csv": "text/csv",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".md": "text/markdown",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain",
  ".webp": "image/webp",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".zip": "application/zip",
};

// POST /api/photos/upload
router.post("/upload", requireApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      file_base64,
      photo_base64,
      original_name,
      mime_type,
      note_title,
      photo_index,
      attachment_index,
    } = req.body as Record<string, unknown>;
    const cfg = getConfig();
    const isLegacyPhotoUpload = !file_base64 && Boolean(photo_base64);
    const { ok, relativePath, error } = isLegacyPhotoUpload
      ? await savePhotoFromBase64(
          env.VAULT_PATH,
          String(photo_base64 || ""),
          String(note_title || "attachment"),
          Number(photo_index || 0),
          cfg
        )
      : await saveAttachmentFromBase64(env.VAULT_PATH, String(file_base64 || ""), cfg, {
          originalName: String(original_name || "attachment"),
          providedMimeType: String(mime_type || ""),
          attachmentIndex: Number(attachment_index || 0),
        });
    if (!ok) {
      res.status(400).json({ status: "error", message: error });
      return;
    }

    let sizeBytes = 0;
    try {
      const fullPath = resolvePhotoPath(env.VAULT_PATH, relativePath, cfg);
      sizeBytes = statSync(fullPath).size;
    } catch {}

    res.json({
      status: "success",
      relative_path: relativePath,
      embed_link: getObsidianEmbed(relativePath),
      wikilink: getObsidianWikilink(relativePath),
      filename: relativePath.split("/").pop(),
      size_bytes: sizeBytes,
    });
  } catch (e: unknown) {
    logger.error(`api_upload_photo_failed: ${(e as Error).message}`);
    res.status(500).json({ status: "error", message: (e as Error).message });
  }
});

// DELETE /api/photos — body: { photo_path }
router.delete("/", requireApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const { photo_path } = req.body as Record<string, unknown>;
    const cfg = getConfig();
    const { ok, error } = deletePhoto(env.VAULT_PATH, String(photo_path || ""), cfg);
    if (!ok) {
      res.status(400).json({ status: "error", message: error });
      return;
    }
    res.json({ status: "success", message: "Attachment deleted" });
  } catch (e: unknown) {
    res.status(500).json({ status: "error", message: (e as Error).message });
  }
});

// GET /api/photos — list recent
router.get("/", requireApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const cfg = getConfig();
    const photos = await listRecentPhotos(env.VAULT_PATH, cfg, limit);
    res.json({ status: "success", photos });
  } catch (e: unknown) {
    res.status(500).json({ status: "error", message: (e as Error).message });
  }
});

// GET /api/photos/file/:path — serve an attachment
router.get(/^\/file\/(.+)$/, async (req: Request, res: Response): Promise<void> => {
  try {
    const photoPath = decodeURIComponent(req.params[0]);
    const cfg = getConfig();
    if (!photoExists(env.VAULT_PATH, photoPath, cfg)) {
      res.status(404).json({ status: "error", message: "Attachment not found" });
      return;
    }
    const fullPath = resolvePhotoPath(env.VAULT_PATH, photoPath, cfg);
    const mime = PHOTO_MIME_TYPES[extname(fullPath).toLowerCase()] || "application/octet-stream";
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "public, max-age=86400");
    createReadStream(fullPath).pipe(res);
  } catch (e: unknown) {
    res.status(500).json({ status: "error", message: "Could not serve photo" });
  }
});

export default router;
