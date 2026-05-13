import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./env.js";
import { logger } from "./utils/logger.js";
import { loadConfig } from "./utils/config.js";

import notesRouter from "./routes/notes.js";
import statusRouter from "./routes/status.js";
import photosRouter from "./routes/photos.js";
import indexRouter from "./routes/index.js";
import configRouter from "./routes/config.js";

// Eager config validation
loadConfig();

const app = express();

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// CORS
const allowedOrigins = env.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV === "development") {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-API-Key"],
  })
);

// Body parsing
app.use(express.json({ limit: env.BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: env.BODY_LIMIT }));

// Logging
app.use(
  morgan("short", {
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip: (req) => req.url === "/api/health",
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === "production" ? 200 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: "error", type: "rate_limited", message: "Too many requests" },
});
app.use("/api", limiter);

// Health check — no auth
app.get("/api/health", (_, res) => {
  res.json({ status: "ok", version: "2.0.0", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/notes", notesRouter);
app.use("/api/status", statusRouter);
app.use("/api/photos", photosRouter);
app.use("/api/index", indexRouter);
app.use("/api", configRouter);

// Serve built React app in production
if (env.NODE_ENV === "production") {
  const { join, resolve, dirname } = await import("path");
  const { fileURLToPath } = await import("url");
  const { existsSync } = await import("fs");
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const clientDist = resolve(__dirname, "../../client/dist");
  if (existsSync(clientDist)) {
    const serveStatic = (await import("express")).default.static;
    app.use(serveStatic(clientDist));
    app.get("*", (_, res) => res.sendFile(join(clientDist, "index.html")));
  }
}

// 404 (dev only or unmatched API)
app.use((req, res) => {
  res.status(404).json({ status: "error", message: `Route ${req.method} ${req.path} not found` });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`unhandled_error: ${err.message}`);
  res.status(500).json({ status: "error", message: err.message });
});

const port = env.PORT;
const host = env.HOST;

app.listen(port, host, () => {
  logger.info(`🚀 Vault Bot server running at http://${host}:${port}`);
  logger.info(`   Environment: ${env.NODE_ENV}`);
});

export default app;
