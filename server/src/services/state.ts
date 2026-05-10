import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { logger } from "../utils/logger.js";

export interface BotState {
  last_note_saved: string | null;
  last_saved_at: string | null;
  last_index_push: string | null;
  last_error: string;
  total_saved: number;
}

export interface RetryState {
  pending: boolean;
  last_error: string;
  updated_at?: string;
}

function nowISO(): string {
  return new Date().toISOString().replace(/\.\d+Z$/, "Z");
}

const defaultBotState: BotState = {
  last_note_saved: null,
  last_saved_at: null,
  last_index_push: null,
  last_error: "",
  total_saved: 0,
};

export function loadBotState(path: string): BotState {
  try {
    if (!existsSync(path)) return { ...defaultBotState };
    const loaded = JSON.parse(readFileSync(path, "utf-8")) as Partial<BotState>;
    if (typeof loaded !== "object") return { ...defaultBotState };
    return { ...defaultBotState, ...loaded };
  } catch {
    return { ...defaultBotState, last_error: "state parse error" };
  }
}

export function saveBotState(path: string, state: BotState): void {
  try {
    mkdirSync(dirname(resolve(path)), { recursive: true });
    writeFileSync(path, JSON.stringify(state, null, 2), "utf-8");
  } catch {
    logger.error("bot_state_save_failed");
  }
}

export function loadRetryState(path: string): RetryState {
  try {
    if (!existsSync(path)) return { pending: false, last_error: "" };
    const loaded = JSON.parse(readFileSync(path, "utf-8")) as Partial<RetryState>;
    if (typeof loaded !== "object") return { pending: false, last_error: "" };
    return { pending: false, last_error: "", ...loaded };
  } catch {
    return { pending: true, last_error: "retry state malformed" };
  }
}
