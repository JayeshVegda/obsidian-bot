import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function noteTypeColor(type: string): string {
  const colors: Record<string, string> = {
    idea: "bg-purple-100 text-purple-700",
    reference: "bg-blue-100 text-blue-700",
    book: "bg-amber-100 text-amber-700",
    meeting: "bg-green-100 text-green-700",
    task: "bg-orange-100 text-orange-700",
    log: "bg-slate-100 text-slate-700",
    code: "bg-cyan-100 text-cyan-700",
    person: "bg-pink-100 text-pink-700",
  };
  return colors[type.toLowerCase()] || "bg-ink-100 text-ink-700";
}
