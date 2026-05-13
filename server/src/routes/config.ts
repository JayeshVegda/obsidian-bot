import { Router, Request, Response } from "express";
import { requireApiKey } from "../middleware/auth.js";
import { getConfig } from "../utils/config.js";
import { env } from "../env.js";
import { existsSync, statSync } from "fs";
import { execFileSync } from "child_process";
import { resolve } from "path";

const router = Router();

const SERVER_VERSION = "2.0.0";

function pathStatus(path: string): { path: string; exists: boolean; type: string } {
  try {
    if (!existsSync(path)) return { path, exists: false, type: "missing" };
    const stat = statSync(path);
    return {
      path,
      exists: true,
      type: stat.isDirectory() ? "directory" : stat.isFile() ? "file" : "other",
    };
  } catch {
    return { path, exists: false, type: "unknown" };
  }
}

function gitStatus(repoPath: string): {
  path: string;
  exists: boolean;
  is_repo: boolean;
  branch: string;
  remote: string;
  clean: boolean | null;
  error: string;
} {
  const base = pathStatus(repoPath);
  if (!base.exists) {
    return { path: repoPath, exists: false, is_repo: false, branch: "", remote: "", clean: null, error: "Path does not exist" };
  }

  try {
    const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: repoPath, encoding: "utf-8" }).trim();
    const branch = execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf-8" }).trim();
    let remote = "";
    try {
      remote = execFileSync("git", ["remote", "get-url", "origin"], { cwd: root, encoding: "utf-8" }).trim();
    } catch {}
    const porcelain = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf-8" }).trim();
    return { path: root, exists: true, is_repo: true, branch, remote, clean: porcelain.length === 0, error: "" };
  } catch (e: unknown) {
    return {
      path: repoPath,
      exists: true,
      is_repo: false,
      branch: "",
      remote: "",
      clean: null,
      error: (e as Error).message,
    };
  }
}

// GET /api/config — public
router.get("/config", (req: Request, res: Response): void => {
  try {
    const cfg = getConfig();
    res.json({
      vault_index_github_url: env.VAULT_INDEX_GITHUB_URL || "",
      server_version: SERVER_VERSION,
      valid_note_types: cfg.note_types.allowed,
      valid_para_folders: cfg.paths.valid_top_level_para_folders,
    });
  } catch (e: unknown) {
    res.status(500).json({ status: "error", message: (e as Error).message });
  }
});

// GET /api/test-key
router.get("/test-key", requireApiKey, (req: Request, res: Response): void => {
  res.json({ status: "success", message: "API key is valid" });
});

// GET /api/settings — authenticated local/runtime configuration summary
router.get("/settings", requireApiKey, (req: Request, res: Response): void => {
  try {
    const cfg = getConfig();
    const vaultIndexIsRemote = env.VAULT_INDEX_PATH.startsWith("http://") || env.VAULT_INDEX_PATH.startsWith("https://");
    const vaultIndexStatus = vaultIndexIsRemote
      ? { path: env.VAULT_INDEX_PATH, exists: true, type: "remote_url" }
      : pathStatus(env.VAULT_INDEX_PATH);

    res.json({
      server_version: SERVER_VERSION,
      node_env: env.NODE_ENV,
      host: env.HOST,
      port: env.PORT,
      cors_origins: env.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean),
      paths: {
        project_root: pathStatus(resolve(".")),
        vault: pathStatus(env.VAULT_PATH),
        attachments_folder: pathStatus(resolve(env.VAULT_PATH, cfg.photos.attachments_folder)),
        vault_index: vaultIndexStatus,
        github_repo: gitStatus(env.GITHUB_REPO_PATH),
        bot_state_file: pathStatus(resolve(cfg.runtime.bot_state_file)),
        retry_state_file: pathStatus(resolve(cfg.runtime.retry_state_file)),
      },
      index: {
        raw_url: env.VAULT_INDEX_GITHUB_URL || "",
        local_or_remote_path: env.VAULT_INDEX_PATH,
        is_remote: vaultIndexIsRemote,
        repo_path: env.GITHUB_REPO_PATH,
      },
      config: {
        quick_notes_folder: cfg.paths.quick_notes_folder,
        attachments_folder: cfg.photos.attachments_folder,
        max_attachment_size_bytes: cfg.photos.max_file_size_bytes,
        allowed_attachment_types: cfg.photos.allowed_mime_types,
        valid_note_types: cfg.note_types.allowed,
        valid_para_folders: cfg.paths.valid_top_level_para_folders,
      },
    });
  } catch (e: unknown) {
    res.status(500).json({ status: "error", message: (e as Error).message });
  }
});

export default router;
