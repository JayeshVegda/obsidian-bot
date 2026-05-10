import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, resolve } from "path";
import yaml from "js-yaml";
import type { NotePayload } from "./validator.js";
import type { AppConfig } from "../utils/config.js";

function safeFilenameFromTitle(title: string, cfg: AppConfig): string {
  let cleaned = title.trim();
  if (cfg.naming.strip_special_characters) {
    cleaned = cleaned.replace(/[^A-Za-z0-9\s_]+/g, "");
  }
  const parts = cleaned.split(/[\s_]+/).filter(Boolean);
  let stem: string;
  if (cfg.naming.use_pascal_case_with_underscores) {
    stem = parts.map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase()).join("_");
  } else {
    stem = parts.join("_");
  }
  stem = stem || "Untitled";
  const filename = `${stem}.md`;
  return filename.slice(0, cfg.naming.max_filename_length);
}

function renderFrontmatter(payload: NotePayload, cfg: AppConfig): string {
  const { ordered_fields, static_fields, list_fields } = cfg.frontmatter;
  const data: Record<string, unknown> = {};

  const dynamicFields = ordered_fields.filter((f) => !(f in static_fields));
  for (const field of dynamicFields) {
    const isListField = list_fields.includes(field);
    if (field in payload) {
      data[field] = (payload as Record<string, unknown>)[field];
    } else {
      data[field] = isListField ? [] : null;
    }
  }
  for (const [field, value] of Object.entries(static_fields)) {
    data[field] = value;
  }

  const yamlBody = yaml.dump(data, { sortKeys: false, lineWidth: -1 }).trim();
  return `---\n${yamlBody}\n---\n`;
}

function renderPhotoAttachments(photos: string[]): string {
  const embeds = photos
    .filter((p) => typeof p === "string" && p.trim())
    .map((p) => {
      const filename = p.replace(/\\/g, "/").split("/").pop();
      return filename ? `![[${filename}]]` : null;
    })
    .filter(Boolean);
  if (!embeds.length) return "";
  return "\n\n## Attachments\n" + embeds.join("\n");
}

export function writeNote(
  payload: NotePayload,
  vaultRoot: string,
  quickNotesFolder: string,
  cfg: AppConfig
): { notePath: string; filename: string } {
  const noteDir = resolve(vaultRoot, quickNotesFolder);
  mkdirSync(noteDir, { recursive: true });

  let filename = safeFilenameFromTitle(payload.title, cfg);
  let notePath = join(noteDir, filename);

  if (existsSync(notePath)) {
    const fmt = cfg.naming.duplicate_suffix_timestamp_format;
    const now = new Date();
    const stamp = fmt
      .replace("%Y", now.getUTCFullYear().toString())
      .replace("%m", String(now.getUTCMonth() + 1).padStart(2, "0"))
      .replace("%d", String(now.getUTCDate()).padStart(2, "0"))
      .replace("%H", String(now.getUTCHours()).padStart(2, "0"))
      .replace("%M", String(now.getUTCMinutes()).padStart(2, "0"))
      .replace("%S", String(now.getUTCSeconds()).padStart(2, "0"));
    const stem = filename.replace(/\.md$/, "");
    filename = `${stem}_${stamp}.md`;
    notePath = join(noteDir, filename);
  }

  const frontmatter = renderFrontmatter(payload, cfg);
  const body = payload.content.trim() + renderPhotoAttachments(payload.photos || []);
  const content = `${frontmatter}\n${body}\n`;

  writeFileSync(notePath, content, "utf-8");
  return { notePath, filename };
}
