import { z } from "zod";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default("0.0.0.0"),

  // Auth
  API_SECRET_KEY: z.string().trim().min(4, "API_SECRET_KEY must be at least 4 characters"),

  // Vault paths
  VAULT_PATH: z.string().min(1, "VAULT_PATH is required"),
  VAULT_INDEX_PATH: z.string().min(1, "VAULT_INDEX_PATH is required"),
  GITHUB_REPO_PATH: z.string().min(1, "GITHUB_REPO_PATH is required"),
  VAULT_INDEX_GITHUB_URL: z.string().url().optional().or(z.literal("")),

  // Optional
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  BODY_LIMIT: z.string().default("35mb"),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    result.error.issues.forEach((issue) => {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    });
    process.exit(1);
  }
  return result.data;
}

export const env = parseEnv();
export type Env = typeof env;
