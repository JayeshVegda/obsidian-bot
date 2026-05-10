import { Router, Request, Response } from "express";
import { requireApiKey } from "../middleware/auth.js";
import { getConfig } from "../utils/config.js";
import { env } from "../env.js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";
import { logger } from "../utils/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

const SERVER_VERSION = "2.0.0";

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

// GET /api/prompts
router.get("/prompts", requireApiKey, (req: Request, res: Response): void => {
  try {
    const cfg = getConfig();
    const promptsFile = cfg.web.prompts_file || "prompts.yaml";
    const promptsPath = resolve(process.cwd(), promptsFile);
    const raw = readFileSync(promptsPath, "utf-8");
    const data = yaml.load(raw) as { prompts?: unknown[] };
    const rawUrl = env.VAULT_INDEX_GITHUB_URL || "";

    const prompts = (data.prompts || [])
      .filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
      .map((item) => ({
        id: String(item.id || ""),
        label: String(item.label || ""),
        description: String(item.description || ""),
        prompt: String(item.prompt || "").replace("{vault_index_url}", rawUrl),
      }));

    res.json({ prompts });
  } catch (e: unknown) {
    logger.error(`api_prompts_failed: ${(e as Error).message}`);
    res.status(500).json({ status: "error", message: (e as Error).message });
  }
});

export default router;
