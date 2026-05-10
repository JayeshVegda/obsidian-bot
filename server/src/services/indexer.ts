import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from "fs";
import { join, resolve, basename, relative } from "path";
import { execFileSync } from "child_process";
import yaml from "js-yaml";
import type { AppConfig } from "../utils/config.js";
import { logger } from "../utils/logger.js";

export interface NoteEntry {
  title: string;
  filename: string;
  tags: string[];
  backlinks: string[];
  photos: string[];
  note_type: string;
  para_suggestion: string;
  created_date: string;
  modified_at: string;
  status: string;
  source: string;
}

export interface VaultIndex {
  last_updated: string;
  last_full_reindex: string | null;
  total_notes: number;
  note_type_counts: Record<string, number>;
  para_folder_counts: Record<string, number>;
  tags: string[];
  tag_frequency: Record<string, number>;
  orphan_notes: string[];
  top_backlink_targets: Array<{ title: string; filename: string; link_count: number }>;
  last_10_notes: Partial<NoteEntry>[];
  notes: NoteEntry[];
  backlinks: Record<string, string[]>;
}

function nowISO(): string {
  return new Date().toISOString().replace(/\.\d+Z$/, "Z");
}

function safeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && !!v.trim());
}

function fileMtimeISO(path: string): string {
  return new Date(statSync(path).mtimeMs).toISOString().replace(/\.\d+Z$/, "Z");
}

function loadFrontmatter(mdPath: string): Record<string, unknown> | null {
  try {
    const text = readFileSync(mdPath, "utf-8");
    if (!text.startsWith("---\n")) return null;
    const parts = text.split("---\n", 3);
    if (parts.length < 3) return null;
    const fm = yaml.load(parts[1]);
    return typeof fm === "object" && fm !== null ? (fm as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function findAllMdFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  function walk(current: string) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".")) walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        results.push(full);
      }
    }
  }
  walk(dir);
  return results.sort();
}

function computeDerived(indexData: VaultIndex, cfg: AppConfig): void {
  const notes = indexData.notes;
  const noteTypes = cfg.note_types.allowed.map((t) => t.toLowerCase());
  const paraFolders = Object.fromEntries(
    cfg.paths.valid_top_level_para_folders.map((f) => [f, 0])
  );
  const topCount = cfg.index.top_backlink_targets_count;
  const lastN = cfg.index.last_n_notes;

  const noteTypeCounts = Object.fromEntries(noteTypes.map((t) => [t, 0]));
  const tagFreq: Record<string, number> = {};
  const allTags = new Set<string>();
  const backlinksMap: Record<string, Set<string>> = {};
  const backlinkCounter: Record<string, number> = {};

  for (const note of notes) {
    const nt = note.note_type?.toLowerCase();
    if (nt && nt in noteTypeCounts) noteTypeCounts[nt]++;

    const paraTop = (note.para_suggestion || "").split("/")[0];
    if (paraTop in paraFolders) paraFolders[paraTop]++;

    for (const tag of note.tags) {
      const norm = tag.toLowerCase();
      allTags.add(norm);
      tagFreq[norm] = (tagFreq[norm] || 0) + 1;
    }

    const source = basename(note.filename, ".md");
    for (const target of note.backlinks) {
      if (!backlinksMap[target]) backlinksMap[target] = new Set();
      backlinksMap[target].add(source);
      backlinkCounter[target] = (backlinkCounter[target] || 0) + 1;
    }
  }

  const linkedTitles = new Set(Object.keys(backlinksMap));
  const orphanNotes = notes
    .filter((n) => !linkedTitles.has(n.title?.trim()))
    .map((n) => n.filename)
    .sort();

  const topBacklinkTargets = Object.entries(backlinkCounter)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topCount)
    .map(([title, link_count]) => ({
      title,
      filename: notes.find((n) => n.title?.trim() === title)?.filename || "",
      link_count,
    }));

  const sorted = [...notes].sort((a, b) => (b.modified_at > a.modified_at ? 1 : -1));
  const last10 = sorted.slice(0, lastN).map((n) => ({
    title: n.title,
    filename: n.filename,
    note_type: n.note_type,
    tags: n.tags,
    photos: n.photos,
    modified_at: n.modified_at,
  }));

  indexData.total_notes = notes.length;
  indexData.note_type_counts = noteTypeCounts;
  indexData.para_folder_counts = paraFolders;
  indexData.tags = [...allTags].sort();
  indexData.tag_frequency = Object.fromEntries(Object.entries(tagFreq).sort());
  indexData.orphan_notes = orphanNotes;
  indexData.top_backlink_targets = topBacklinkTargets;
  indexData.last_10_notes = last10;
  indexData.backlinks = Object.fromEntries(
    Object.entries(backlinksMap).map(([k, v]) => [k, [...v].sort()])
  );
}

function readIndex(indexPath: string): VaultIndex | null {
  if (indexPath.startsWith("http://") || indexPath.startsWith("https://")) {
    return null; // read-only remote
  }
  if (!existsSync(indexPath)) return null;
  try {
    return JSON.parse(readFileSync(indexPath, "utf-8")) as VaultIndex;
  } catch {
    return null;
  }
}

function writeIndex(indexPath: string, data: VaultIndex): void {
  if (indexPath.startsWith("http://") || indexPath.startsWith("https://")) {
    logger.warn("Cannot write to URL index, skipping write");
    return;
  }
  const dir = resolve(indexPath, "..");
  mkdirSync(dir, { recursive: true });
  writeFileSync(indexPath, JSON.stringify(data, null, 2), "utf-8");
}

function emptyIndex(cfg: AppConfig): VaultIndex {
  return {
    last_updated: nowISO(),
    last_full_reindex: null,
    total_notes: 0,
    note_type_counts: Object.fromEntries(cfg.note_types.allowed.map((t) => [t.toLowerCase(), 0])),
    para_folder_counts: Object.fromEntries(
      cfg.paths.valid_top_level_para_folders.map((f) => [f, 0])
    ),
    tags: [],
    tag_frequency: {},
    orphan_notes: [],
    top_backlink_targets: [],
    last_10_notes: [],
    notes: [],
    backlinks: {},
  };
}

export function fullReindex(vaultRoot: string, indexPath: string, cfg: AppConfig): VaultIndex {
  const mdFiles = findAllMdFiles(vaultRoot);
  const notes: NoteEntry[] = [];

  for (const mdFile of mdFiles) {
    const fm = loadFrontmatter(mdFile);
    if (!fm) continue;
    const fmSource = String(fm.source || "").trim();
    const source = ["telegram-bot", "webapp"].includes(fmSource) ? fmSource : "manual";
    notes.push({
      title: String(fm.title || basename(mdFile, ".md")),
      filename: basename(mdFile),
      tags: safeList(fm.tags),
      backlinks: safeList(fm.backlinks),
      photos: safeList(fm.photos),
      note_type: String(fm.note_type || ""),
      para_suggestion: String(fm.para_suggestion || ""),
      created_date: String(fm.created_date || ""),
      modified_at: fileMtimeISO(mdFile),
      status: String(fm.status || ""),
      source,
    });
  }

  const index = emptyIndex(cfg);
  index.notes = notes.sort((a, b) => a.filename.localeCompare(b.filename));
  computeDerived(index, cfg);
  const now = nowISO();
  index.last_updated = now;
  index.last_full_reindex = now;
  writeIndex(indexPath, index);
  logger.info(`full_reindex_complete total_notes=${notes.length}`);
  return index;
}

export function incrementalUpdate(vaultRoot: string, indexPath: string, cfg: AppConfig): VaultIndex {
  const current = readIndex(indexPath);
  if (!current || !Array.isArray(current.notes)) {
    return fullReindex(vaultRoot, indexPath, cfg);
  }

  const mdFiles = findAllMdFiles(vaultRoot);
  if (!mdFiles.length) {
    const empty = emptyIndex(cfg);
    empty.last_full_reindex = current.last_full_reindex;
    writeIndex(indexPath, empty);
    return empty;
  }

  const latest = mdFiles.reduce((a, b) => (statSync(a).mtimeMs > statSync(b).mtimeMs ? a : b));
  const fm = loadFrontmatter(latest);
  if (!fm) return fullReindex(vaultRoot, indexPath, cfg);

  const fmSource = String(fm.source || "").trim();
  const source = ["telegram-bot", "webapp"].includes(fmSource) ? fmSource : "manual";
  const newNote: NoteEntry = {
    title: String(fm.title || basename(latest, ".md")),
    filename: basename(latest),
    tags: safeList(fm.tags),
    backlinks: safeList(fm.backlinks),
    photos: safeList(fm.photos),
    note_type: String(fm.note_type || ""),
    para_suggestion: String(fm.para_suggestion || ""),
    created_date: String(fm.created_date || ""),
    modified_at: fileMtimeISO(latest),
    status: String(fm.status || ""),
    source,
  };

  const notes = current.notes
    .filter((n) => n.filename !== newNote.filename)
    .concat(newNote);

  current.notes = notes;
  current.last_full_reindex = current.last_full_reindex ?? null;
  computeDerived(current, cfg);
  current.last_updated = nowISO();
  writeIndex(indexPath, current);
  return current;
}

export function regenerateIndex(vaultRoot: string, indexPath: string, cfg: AppConfig): VaultIndex {
  // A full scan keeps the web index honest after note deletes, renames, or manual edits.
  return fullReindex(vaultRoot, indexPath, cfg);
}

function sanitizeCommitTitle(title: string): string {
  return title
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^A-Za-z0-9 _\-.:\/]/g, "")
    .trim() || "untitled";
}

function runGit(args: string[], cwd: string): { ok: boolean; output: string } {
  try {
    const out = execFileSync("git", args, { cwd, encoding: "utf-8" });
    return { ok: true, output: out };
  } catch (e: unknown) {
    const err = e as { stderr?: Buffer | string; stdout?: Buffer | string; message?: string };
    const msg = [err.stderr, err.stdout, err.message]
      .filter(Boolean)
      .map((part) => part?.toString().trim())
      .filter(Boolean)
      .join("\n") || "git error";
    return { ok: false, output: msg };
  }
}

function gitOutput(args: string[], cwd: string): string {
  return execFileSync("git", args, { cwd, encoding: "utf-8" }).trim();
}

function getRepoContext(repoPath: string, indexPath?: string): { ok: true; root: string; branch: string; indexArg?: string } | { ok: false; message: string } {
  try {
    const root = gitOutput(["rev-parse", "--show-toplevel"], repoPath);
    const branch = gitOutput(["branch", "--show-current"], root) || "main";
    let indexArg: string | undefined;

    if (indexPath) {
      const resolvedIndex = resolve(indexPath);
      const rel = relative(root, resolvedIndex);
      if (rel.startsWith("..") || rel === "") {
        return { ok: false, message: `Index path is outside git repo: ${resolvedIndex}` };
      }
      indexArg = rel;
    }

    return { ok: true, root, branch, indexArg };
  } catch (e: unknown) {
    return {
      ok: false,
      message: `Git repo is not initialized at ${repoPath}: ${(e as Error).message}`,
    };
  }
}

function syncCurrentBranch(root: string, branch: string): { ok: boolean; output: string } {
  const pull = runGit(["pull", "--rebase", "origin", branch], root);
  if (!pull.ok) return pull;
  return runGit(["push", "origin", branch], root);
}

interface RetryState {
  pending: boolean;
  last_error: string;
  updated_at: string;
}

function loadRetryState(retryStatePath: string): RetryState {
  try {
    if (!existsSync(retryStatePath)) return { pending: false, last_error: "", updated_at: nowISO() };
    return JSON.parse(readFileSync(retryStatePath, "utf-8")) as RetryState;
  } catch {
    return { pending: true, last_error: "retry state malformed", updated_at: nowISO() };
  }
}

function saveRetryState(retryStatePath: string, pending: boolean, last_error = ""): void {
  const dir = resolve(retryStatePath, "..");
  mkdirSync(dir, { recursive: true });
  writeFileSync(retryStatePath, JSON.stringify({ pending, last_error, updated_at: nowISO() }, null, 2), "utf-8");
}

export function pushIndexUpdate(
  repoPath: string,
  indexPath: string,
  title: string,
  retryStatePath: string
): { pushed: boolean; message: string } {
  if (indexPath.startsWith("http://") || indexPath.startsWith("https://")) {
    saveRetryState(retryStatePath, false);
    return { pushed: true, message: "Index is read-only URL, skipping push" };
  }

  const repo = getRepoContext(repoPath, indexPath);
  if (!repo.ok) {
    saveRetryState(retryStatePath, true, repo.message);
    return { pushed: false, message: repo.message };
  }
  if (!repo.indexArg) {
    const message = "Index path could not be resolved inside the git repo";
    saveRetryState(retryStatePath, true, message);
    return { pushed: false, message };
  }

  const add = runGit(["add", repo.indexArg], repo.root);
  if (!add.ok) {
    saveRetryState(retryStatePath, true, add.output);
    return { pushed: false, message: add.output };
  }

  const safe = sanitizeCommitTitle(title);
  const commit = runGit(["commit", "-m", `vault-index: sync ${safe}`], repo.root);
  if (!commit.ok && !commit.output.toLowerCase().includes("nothing to commit")) {
    saveRetryState(retryStatePath, true, commit.output);
    return { pushed: false, message: commit.output };
  }

  const push = syncCurrentBranch(repo.root, repo.branch);
  if (push.ok) {
    saveRetryState(retryStatePath, false);
    return { pushed: true, message: "index push successful" };
  }
  saveRetryState(retryStatePath, true, push.output);
  return { pushed: false, message: push.output };
}

export function retryFailedPush(repoPath: string, retryStatePath: string): { pushed: boolean; message: string } {
  const state = loadRetryState(retryStatePath);
  if (!state.pending) return { pushed: true, message: "no pending retries" };
  const repo = getRepoContext(repoPath);
  if (!repo.ok) {
    saveRetryState(retryStatePath, true, repo.message);
    return { pushed: false, message: repo.message };
  }
  const push = syncCurrentBranch(repo.root, repo.branch);
  if (push.ok) {
    saveRetryState(retryStatePath, false);
    return { pushed: true, message: "retry successful" };
  }
  saveRetryState(retryStatePath, true, push.output);
  return { pushed: false, message: push.output };
}

export { loadRetryState };
