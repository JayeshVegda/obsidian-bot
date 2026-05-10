import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireApiKey } from "../middleware/auth.js";
import { notePayloadSchema, validateNotePayload } from "../services/validator.js";
import { writeNote } from "../services/writer.js";
import { regenerateIndex, pushIndexUpdate } from "../services/indexer.js";
import { loadBotState, saveBotState } from "../services/state.js";
import { loadRetryState } from "../services/state.js";
import { getConfig } from "../utils/config.js";
import { env } from "../env.js";
import { logger } from "../utils/logger.js";
import { resolve } from "path";

const router = Router();

function nowISO(): string {
  return new Date().toISOString().replace(/\.\d+Z$/, "Z");
}

function stateFilePaths() {
  const cfg = getConfig();
  const root = resolve(".");
  return {
    botStatePath: resolve(root, cfg.runtime.bot_state_file),
    retryStatePath: resolve(root, cfg.runtime.retry_state_file),
  };
}

// POST /api/notes — save a note
router.post("/", requireApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = notePayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        status: "error",
        type: "validation_failed",
        errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      });
      return;
    }

    const payload = parsed.data;
    const cfg = getConfig();
    const errors = validateNotePayload(payload, cfg);
    if (errors.length > 0) {
      res.status(400).json({ status: "error", type: "validation_failed", errors });
      return;
    }

    const { filename } = writeNote(payload, env.VAULT_PATH, cfg.paths.quick_notes_folder, cfg);

    regenerateIndex(env.VAULT_PATH, env.VAULT_INDEX_PATH, cfg);

    const { pushed, message } = pushIndexUpdate(
      env.GITHUB_REPO_PATH,
      env.VAULT_INDEX_PATH,
      payload.title,
      stateFilePaths().retryStatePath
    );

    const { botStatePath } = stateFilePaths();
    const state = loadBotState(botStatePath);
    state.last_note_saved = filename;
    state.last_saved_at = nowISO();
    state.total_saved = (state.total_saved || 0) + 1;
    state.last_index_push = pushed ? nowISO() : state.last_index_push;
    state.last_error = pushed ? "" : message;
    saveBotState(botStatePath, state);

    logger.info(`note_saved filename=${filename} index_pushed=${pushed}`);

    res.json({
      status: "success",
      filename,
      tags: payload.tags,
      backlinks: payload.backlinks,
      para_suggestion: payload.para_suggestion,
      note_type: payload.note_type,
      index_pushed: pushed,
    });
  } catch (e: unknown) {
    logger.error(`api_save_failed: ${(e as Error).message}`);
    res.status(500).json({ status: "error", type: "server_error", message: (e as Error).message });
  }
});

export default router;
