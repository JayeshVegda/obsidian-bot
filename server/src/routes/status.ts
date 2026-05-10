import { Router, Request, Response } from "express";
import { requireApiKey } from "../middleware/auth.js";
import { loadBotState, loadRetryState } from "../services/state.js";
import { getConfig } from "../utils/config.js";
import { env } from "../env.js";
import { logger } from "../utils/logger.js";
import { resolve } from "path";
import { readFileSync, existsSync } from "fs";

const router = Router();

function nowISO(): string {
  return new Date().toISOString().replace(/\.\d+Z$/, "Z");
}

router.get("/", requireApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const cfg = getConfig();
    const botStatePath = resolve(cfg.runtime.bot_state_file);
    const retryStatePath = resolve(cfg.runtime.retry_state_file);

    const state = loadBotState(botStatePath);
    const retryState = loadRetryState(retryStatePath);

    let indexData: Record<string, unknown> = {};
    try {
      const ip = env.VAULT_INDEX_PATH;
      if (ip.startsWith("http://") || ip.startsWith("https://")) {
        const resp = await fetch(ip);
        indexData = await resp.json() as Record<string, unknown>;
      } else if (existsSync(ip)) {
        indexData = JSON.parse(readFileSync(ip, "utf-8")) as Record<string, unknown>;
      }
    } catch {
      logger.warn("Could not read vault index for status");
    }

    const tagFrequency = indexData.tag_frequency as Record<string, number> | undefined;
    const top20Tags = tagFrequency
      ? Object.fromEntries(
          Object.entries(tagFrequency)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
        )
      : {};

    const last10 = (indexData.last_10_notes as unknown[] | undefined || [])
      .slice(0, 10)
      .map((item) => {
        const n = item as Record<string, unknown>;
        return {
          filename: String(n.filename || ""),
          title: String(n.title || ""),
          note_type: String(n.note_type || ""),
          tags: Array.isArray(n.tags) ? n.tags : [],
          photos: Array.isArray(n.photos) ? n.photos : [],
          timestamp: String(n.modified_at || ""),
        };
      });

    res.json({
      total_notes: Number(indexData.total_notes || 0),
      total_tags: Array.isArray(indexData.tags) ? (indexData.tags as unknown[]).length : 0,
      total_saved_via_app: state.total_saved,
      note_type_counts: indexData.note_type_counts || {},
      para_folder_counts: indexData.para_folder_counts || {},
      tag_frequency: top20Tags,
      orphan_count: Array.isArray(indexData.orphan_notes) ? (indexData.orphan_notes as unknown[]).length : 0,
      last_note: state.last_note_saved,
      last_saved_at: state.last_saved_at,
      last_index_push: state.last_index_push,
      last_error: state.last_error,
      index_push_pending: Boolean(retryState.pending),
      recent_notes: last10,
    });
  } catch (e: unknown) {
    logger.error(`api_status_failed: ${(e as Error).message}`);
    res.status(500).json({ status: "error", type: "server_error", message: (e as Error).message });
  }
});

export default router;
