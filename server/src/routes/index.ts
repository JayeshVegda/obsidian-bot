import { Router, Request, Response } from "express";
import { requireApiKey } from "../middleware/auth.js";
import {
  fullReindex,
  pushIndexUpdate,
} from "../services/indexer.js";
import { loadBotState, saveBotState } from "../services/state.js";
import { getConfig } from "../utils/config.js";
import { env } from "../env.js";
import { logger } from "../utils/logger.js";
import { resolve } from "path";

const router = Router();

function nowISO(): string {
  return new Date().toISOString().replace(/\.\d+Z$/, "Z");
}

// POST /api/index/reindex
router.post("/reindex", requireApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const cfg = getConfig();
    const retryStatePath = resolve(cfg.runtime.retry_state_file);
    const botStatePath = resolve(cfg.runtime.bot_state_file);

    const indexData = fullReindex(env.VAULT_PATH, env.VAULT_INDEX_PATH, cfg);
    const { pushed, message } = pushIndexUpdate(
      env.GITHUB_REPO_PATH,
      env.VAULT_INDEX_PATH,
      "full reindex",
      retryStatePath
    );

    const state = loadBotState(botStatePath);
    state.last_index_push = pushed ? nowISO() : state.last_index_push;
    state.last_error = pushed ? "" : message;
    saveBotState(botStatePath, state);

    res.json({
      status: "success",
      type: "reindex_complete",
      total_notes: indexData.total_notes,
      total_tags: indexData.tags.length,
      orphan_count: indexData.orphan_notes.length,
      index_pushed: pushed,
      message,
    });
  } catch (e: unknown) {
    logger.error(`api_reindex_failed: ${(e as Error).message}`);
    res.status(500).json({ status: "error", type: "server_error", message: (e as Error).message });
  }
});

// POST /api/index/retry-push
router.post("/retry-push", requireApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const cfg = getConfig();
    const retryStatePath = resolve(cfg.runtime.retry_state_file);
    const { pushed, message } = pushIndexUpdate(
      env.GITHUB_REPO_PATH,
      env.VAULT_INDEX_PATH,
      "retry pending index push",
      retryStatePath
    );
    res.json({ status: pushed ? "success" : "error", message });
  } catch (e: unknown) {
    res.status(500).json({ status: "error", message: (e as Error).message });
  }
});

export default router;
