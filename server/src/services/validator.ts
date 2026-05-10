import { z } from "zod";
import type { AppConfig } from "../utils/config.js";

export const notePayloadSchema = z.object({
  title: z.string(),
  tags: z.array(z.string()),
  backlinks: z.array(z.string()),
  note_type: z.string(),
  para_suggestion: z.string(),
  created_date: z.string(),
  content: z.string(),
  photos: z.array(z.string()).optional().default([]),
});

export type NotePayload = z.infer<typeof notePayloadSchema>;

function isParseableISODate(value: string): boolean {
  const raw = value.trim();
  if (!raw) return false;
  const candidates = [raw, raw.replace(" ", "T")];
  for (const candidate of candidates) {
    try {
      const d = new Date(candidate.replace("Z", "+00:00"));
      if (!isNaN(d.getTime())) return true;
    } catch {}
  }
  return false;
}

export function validateNotePayload(payload: NotePayload, cfg: AppConfig): string[] {
  const errors: string[] = [];
  const { validation, note_types } = cfg;
  const allowedNoteTypes = new Set(note_types.allowed.map((t) => t.toLowerCase()));

  // Required non-empty strings
  const requiredStrings = ["title", "note_type", "para_suggestion", "created_date", "content"] as const;
  for (const field of requiredStrings) {
    if (!payload[field]?.trim()) {
      errors.push(`${field}: must be a non-empty string`);
    }
  }

  if (!payload.tags || payload.tags.length === 0) {
    errors.push("tags: must be a non-empty list");
  }

  if (errors.length > 0) return errors;

  // Note type
  if (!allowedNoteTypes.has(payload.note_type.trim().toLowerCase())) {
    errors.push(
      `note_type: must be one of ${[...allowedNoteTypes].sort().join(", ")} (case-insensitive)`
    );
  }

  // Title length
  if (payload.title.trim().length > validation.max_title_length) {
    errors.push(`title: exceeds max length (${validation.max_title_length})`);
  }

  // Forbidden titles
  const normalizedTitle = payload.title.trim().toLowerCase();
  const forbiddenTitles = validation.forbidden_titles.map((t) => t.trim().toLowerCase());
  if (validation.forbidden_title_match === "exact_word_only") {
    for (const forbidden of forbiddenTitles) {
      if (!forbidden) continue;
      const re = new RegExp(`\\b${forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
      if (re.test(normalizedTitle)) {
        errors.push(`title: contains forbidden standalone word '${forbidden}'`);
        break;
      }
    }
  } else if (new Set(forbiddenTitles).has(normalizedTitle)) {
    errors.push("title: too generic, choose a specific title");
  }

  // Max tags
  if (validation.max_tags !== undefined && payload.tags.length > validation.max_tags) {
    errors.push(`tags: exceeds max allowed (${validation.max_tags})`);
  }

  // List item validation
  for (const field of ["tags", "backlinks", "photos"] as const) {
    (payload[field] || []).forEach((item, idx) => {
      if (typeof item !== "string" || !item.trim()) {
        errors.push(`${field}[${idx}]: must be a non-empty string`);
      }
    });
  }

  // Photo path safety
  (payload.photos || []).forEach((photoPath, idx) => {
    if (typeof photoPath !== "string") return;
    const normalized = photoPath.replace(/\\/g, "/");
    if (normalized.startsWith("/") || normalized.split("/").includes("..")) {
      errors.push(`photos[${idx}]: invalid vault relative path`);
    }
  });

  // Content word count
  const wordCount = payload.content.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < validation.min_content_words) {
    errors.push(`content: too short (minimum ${validation.min_content_words} words)`);
  }
  if (validation.max_content_words && wordCount > validation.max_content_words) {
    errors.push(`content: too long (maximum ${validation.max_content_words} words)`);
  }

  // Date
  if (!isParseableISODate(payload.created_date)) {
    errors.push("created_date: must be a valid ISO date/datetime string");
  }

  return errors;
}
