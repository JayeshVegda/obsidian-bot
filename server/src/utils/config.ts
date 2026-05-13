import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

const configSchema = z.object({
  paths: z.object({
    quick_notes_folder: z.string(),
    valid_top_level_para_folders: z.array(z.string()),
  }),
  photos: z.object({
    attachments_folder: z.string(),
    max_file_size_bytes: z.number(),
    allowed_mime_types: z.array(z.string()),
    serve_via_api: z.boolean().default(true),
  }),
  json_input: z.object({
    required_fields: z.array(z.string()),
    field_types: z.record(z.string()),
  }),
  note_types: z.object({
    allowed: z.array(z.string()),
  }),
  validation: z.object({
    min_content_words: z.number(),
    max_content_words: z.number(),
    max_title_length: z.number(),
    forbidden_titles: z.array(z.string()),
    forbidden_title_match: z.string().default("exact_word_only"),
    max_tags: z.number().optional(),
  }),
  naming: z.object({
    strip_special_characters: z.boolean(),
    use_pascal_case_with_underscores: z.boolean(),
    duplicate_suffix_timestamp_format: z.string(),
    max_filename_length: z.number(),
  }),
  frontmatter: z.object({
    ordered_fields: z.array(z.string()),
    static_fields: z.record(z.string()),
    list_fields: z.array(z.string()),
  }),
  index: z.object({
    incremental_on_save: z.boolean(),
    last_n_notes: z.number(),
    top_backlink_targets_count: z.number(),
  }),
  runtime: z.object({
    retry_state_file: z.string(),
    bot_state_file: z.string(),
  }),
  logging: z.object({
    log_dir: z.string(),
    log_file: z.string(),
    max_bytes: z.number(),
    backup_count: z.number(),
  }),
});

export type AppConfig = z.infer<typeof configSchema>;

let _config: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (_config) return _config;
  const configPath = resolve(ROOT, "config.yaml");
  const raw = readFileSync(configPath, "utf-8");
  const parsed = yaml.load(raw);
  const result = configSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid config.yaml: ${result.error.message}`);
  }
  _config = result.data;
  return _config;
}

export function getConfig(): AppConfig {
  return loadConfig();
}
