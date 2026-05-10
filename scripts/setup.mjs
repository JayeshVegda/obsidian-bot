#!/usr/bin/env node
/**
 * vault-bot setup script
 * Run: node scripts/setup.mjs
 */

import { existsSync, copyFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

function log(color, symbol, msg) {
  console.log(`${color}${symbol}${RESET} ${msg}`);
}

function step(msg) { log(CYAN, "→", msg); }
function ok(msg)   { log(GREEN, "✓", msg); }
function warn(msg) { log(YELLOW, "⚠", msg); }
function fail(msg) { log(RED, "✗", msg); }

console.log(`\n${CYAN}╔══════════════════════════════╗${RESET}`);
console.log(`${CYAN}║     Vault Bot Setup v2.0     ║${RESET}`);
console.log(`${CYAN}╚══════════════════════════════╝${RESET}\n`);

// Check Node version
const nodeVer = process.versions.node.split(".").map(Number);
if (nodeVer[0] < 20) {
  fail(`Node.js 20+ is required. You have ${process.version}`);
  process.exit(1);
}
ok(`Node.js ${process.version}`);

// Copy .env
const envPath = resolve(ROOT, ".env");
const envExample = resolve(ROOT, ".env.example");
if (!existsSync(envPath)) {
  copyFileSync(envExample, envPath);
  ok("Created .env from .env.example");
  warn("Edit .env and fill in your values before starting the server!");
} else {
  ok(".env already exists");
}

// Create logs dir
const logsDir = resolve(ROOT, "logs");
mkdirSync(logsDir, { recursive: true });
ok("logs/ directory ready");

// Install dependencies
step("Installing dependencies…");
try {
  execSync("npm install", { cwd: ROOT, stdio: "inherit" });
  ok("Dependencies installed");
} catch {
  fail("npm install failed");
  process.exit(1);
}

console.log(`\n${GREEN}Setup complete!${RESET}\n`);
console.log("Next steps:");
console.log(`  1. Edit ${CYAN}.env${RESET} with your vault paths and API key`);
console.log(`  2. Run ${CYAN}npm run dev${RESET} to start in development mode`);
console.log(`  3. Open ${CYAN}http://localhost:5173${RESET} in your browser\n`);
console.log(`Production:`);
console.log(`  ${CYAN}npm run build && npm start${RESET}\n`);
