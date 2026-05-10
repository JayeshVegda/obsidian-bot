import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { env } from "../env.js";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const logDir = resolve(__dirname, "../../../logs");

const { combine, timestamp, colorize, printf, json } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: "HH:mm:ss" }),
  printf(({ timestamp, level, message, ...meta }) => {
    const extra = Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
    return `${timestamp} ${level} ${message}${extra}`;
  })
);

const prodFormat = combine(timestamp(), json());

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: env.NODE_ENV === "production" ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    new DailyRotateFile({
      dirname: logDir,
      filename: "vault-bot-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxSize: "5m",
      maxFiles: "7d",
      format: prodFormat,
    }),
  ],
});
