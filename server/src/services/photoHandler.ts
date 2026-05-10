import { writeFileSync, unlinkSync, existsSync, readdirSync, statSync, mkdirSync } from "fs";
import { resolve, join, basename } from "path";
import { fileTypeFromBuffer } from "file-type";
import type { AppConfig } from "../utils/config.js";
import { logger } from "../utils/logger.js";

const EXTENSIONS_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heic",
};

function photoCfg(cfg: AppConfig) {
  return cfg.photos;
}

function attachmentsFolder(cfg: AppConfig): string {
  const folder = cfg.photos.attachments_folder.replace(/\\/g, "/");
  if (folder.startsWith("/") || folder.includes("..")) {
    throw new Error("Invalid photos.attachments_folder config");
  }
  return folder;
}

function attachmentsDir(vaultRoot: string, cfg: AppConfig): string {
  const vault = resolve(vaultRoot);
  const folder = attachmentsFolder(cfg);
  const dir = resolve(vault, folder);
  if (!dir.startsWith(vault)) throw new Error("Attachments folder must stay inside vault");
  return dir;
}

function sanitizeTitle(title: string): string {
  let cleaned = (title || "attachment").replace(/[/\\]+/g, " ").replace(/[^A-Za-z0-9\s_-]+/g, "");
  const parts = cleaned.split(/[\s_-]+/).filter(Boolean);
  const stem = parts.map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase()).join("_") || "Attachment";
  return stem.slice(0, 120);
}

function safeFilename(stem: string, ext: string): string {
  let filename = `${stem}${ext}`.replace(/[^A-Za-z0-9_.-]+/g, "_").replace(/^[._]+/, "");
  if (filename.length > 200) {
    const suffix = filename.endsWith(ext) ? ext : "";
    filename = filename.slice(0, 200 - suffix.length).replace(/[._]+$/, "") + suffix;
  }
  return filename || `Attachment${ext}`;
}

function extractRawBase64(data: string): string {
  const raw = (data || "").trim();
  if (raw.startsWith("data:") && raw.includes(",")) {
    return raw.split(",", 2)[1].replace(/\s+/g, "");
  }
  return raw.replace(/\s+/g, "");
}

export function resolvePhotoPath(vaultRoot: string, relativePath: string, cfg: AppConfig): string {
  const normalized = (relativePath || "").replace(/\\/g, "/");
  if (normalized.startsWith("/") || normalized.split("/").includes("..")) {
    throw new Error("Invalid photo path");
  }
  const dir = attachmentsDir(vaultRoot, cfg);
  const folder = attachmentsFolder(cfg);
  if (!normalized.startsWith(folder)) {
    throw new Error("Photo path must be inside attachments folder");
  }
  const full = resolve(vaultRoot, normalized);
  if (!full.startsWith(dir)) throw new Error("Photo path escapes attachments folder");
  return full;
}

export function getObsidianEmbed(relativePath: string): string {
  return `![[${basename(relativePath)}]]`;
}

export function getObsidianWikilink(relativePath: string): string {
  return `[[${basename(relativePath)}]]`;
}

export async function savePhotoFromBase64(
  vaultRoot: string,
  base64Data: string,
  noteTitle: string,
  photoIndex: number,
  cfg: AppConfig
): Promise<{ ok: boolean; relativePath: string; error: string }> {
  try {
    const pcfg = photoCfg(cfg);
    const maxSize = pcfg.max_file_size_bytes;
    const raw = extractRawBase64(base64Data);
    if (!raw) return { ok: false, relativePath: "", error: "photo_base64 is required" };

    const imageBytes = Buffer.from(raw, "base64");
    if (imageBytes.length > maxSize) {
      return { ok: false, relativePath: "", error: `Image exceeds max file size of ${maxSize} bytes` };
    }

    const fileType = await fileTypeFromBuffer(imageBytes);
    const mimeType = fileType?.mime || "";
    const allowed = new Set(pcfg.allowed_mime_types.map((m) => m.toLowerCase()));
    if (!allowed.has(mimeType)) {
      return { ok: false, relativePath: "", error: `Unsupported image type: ${mimeType || "unknown"}` };
    }

    const dir = attachmentsDir(vaultRoot, cfg);
    mkdirSync(dir, { recursive: true });

    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:]/g, "").replace("T", "T").split(".")[0];
    const ext = EXTENSIONS_BY_MIME[mimeType] || ".jpg";
    const stem = `${sanitizeTitle(noteTitle)}_photo_${Math.max(0, photoIndex)}_${timestamp}`;
    const filename = safeFilename(stem, ext);
    const filePath = resolve(dir, filename);
    if (!filePath.startsWith(dir)) return { ok: false, relativePath: "", error: "Path escape detected" };

    writeFileSync(filePath, imageBytes);
    const relPath = `${attachmentsFolder(cfg)}/${filename}`;
    logger.info(`photo_saved file=${relPath} size=${imageBytes.length}`);
    return { ok: true, relativePath: relPath, error: "" };
  } catch (e: unknown) {
    const err = e as Error;
    logger.error(`photo_save_failed: ${err.message}`);
    return { ok: false, relativePath: "", error: `Failed to save photo: ${err.message}` };
  }
}

export function deletePhoto(
  vaultRoot: string,
  relativePath: string,
  cfg: AppConfig
): { ok: boolean; error: string } {
  try {
    const fullPath = resolvePhotoPath(vaultRoot, relativePath, cfg);
    if (!existsSync(fullPath)) return { ok: false, error: "Photo not found" };
    const stat = statSync(fullPath);
    if (!stat.isFile()) return { ok: false, error: "Photo path is not a file" };
    unlinkSync(fullPath);
    logger.info(`photo_deleted file=${relativePath}`);
    return { ok: true, error: "" };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export function photoExists(vaultRoot: string, relativePath: string, cfg: AppConfig): boolean {
  try {
    const fullPath = resolvePhotoPath(vaultRoot, relativePath, cfg);
    return existsSync(fullPath) && statSync(fullPath).isFile();
  } catch {
    return false;
  }
}

export async function listRecentPhotos(
  vaultRoot: string,
  cfg: AppConfig,
  limit = 20
): Promise<Array<Record<string, unknown>>> {
  try {
    const dir = attachmentsDir(vaultRoot, cfg);
    if (!existsSync(dir)) return [];
    const allowed = new Set(cfg.photos.allowed_mime_types.map((m) => m.toLowerCase()));
    const photos: Array<Record<string, unknown>> = [];

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const fullPath = join(dir, entry.name);
      const buf = Buffer.alloc(4100);
      const fd = (await import("fs")).openSync(fullPath, "r");
      (await import("fs")).readSync(fd, buf, 0, 4100, 0);
      (await import("fs")).closeSync(fd);
      const fileType = await fileTypeFromBuffer(buf);
      const mime = fileType?.mime || "";
      if (!allowed.has(mime)) continue;
      const stat = statSync(fullPath);
      const relPath = `${attachmentsFolder(cfg)}/${entry.name}`;
      photos.push({
        filename: entry.name,
        relative_path: relPath,
        size_bytes: stat.size,
        modified_at: new Date(stat.mtimeMs).toISOString().replace(/\.\d+Z$/, "Z"),
        embed_link: getObsidianEmbed(relPath),
        wikilink: getObsidianWikilink(relPath),
      });
    }

    return photos
      .sort((a, b) => String(b.modified_at) > String(a.modified_at) ? 1 : -1)
      .slice(0, limit);
  } catch (e: unknown) {
    logger.error(`photo_list_failed: ${(e as Error).message}`);
    return [];
  }
}
