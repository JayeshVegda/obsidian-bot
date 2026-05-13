import type { ElementType } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Download,
  FilePlus2,
  FileText,
  FolderKanban,
  GitBranch,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Tag,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useReindex, useRetryPush, useVaultStatus } from "@/hooks/useVault";
import { cn, formatDate, noteTypeColor } from "@/lib/utils";

type MetricTone = "blue" | "emerald" | "amber" | "rose";

const TONE_STYLES: Record<MetricTone, {
  icon: string;
  badge: string;
  area: string;
  stroke: string;
}> = {
  blue: {
    icon: "bg-vault-50 text-vault-600",
    badge: "bg-vault-50 text-vault-700",
    area: "#c0d3ff",
    stroke: "#2f5fff",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-600",
    badge: "bg-emerald-50 text-emerald-700",
    area: "#bbf7d0",
    stroke: "#16a34a",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600",
    badge: "bg-amber-50 text-amber-700",
    area: "#fde68a",
    stroke: "#d97706",
  },
  rose: {
    icon: "bg-rose-50 text-rose-600",
    badge: "bg-rose-50 text-rose-700",
    area: "#fecdd3",
    stroke: "#e11d48",
  },
};

const BAR_COLORS = ["#2f5fff", "#16a34a", "#d97706", "#e11d48", "#7c3aed", "#0891b2"];
const PIE_COLORS = ["#2f5fff", "#16a34a", "#d97706", "#e11d48", "#7c3aed", "#0891b2", "#64748b"];

function makeSparkline(value: number) {
  const base = Math.max(value, 1);
  return Array.from({ length: 8 }, (_, index) => ({
    name: index,
    value: Math.max(1, Math.round(base * (0.38 + index * 0.075 + ((index % 3) * 0.055)))),
  }));
}

function cleanFolderName(name: string) {
  const cleaned = name.replace(/^\d+[_\-\s]*/, "").replace(/[_-]/g, " ").trim();
  return cleaned || name;
}

function percentage(value: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  helper: string;
  icon: ElementType;
  tone: MetricTone;
}) {
  const style = TONE_STYLES[tone];
  const numeric = typeof value === "number" ? value : Number.parseInt(String(value), 10) || 1;

  return (
    <div className="card overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", style.icon)}>
          <Icon className="h-5 w-5" />
        </div>
        <span className={cn("rounded-md px-2 py-1 text-[11px] font-semibold", style.badge)}>
          Live
        </span>
      </div>
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</p>
        <p className="mt-1 text-3xl font-semibold text-ink-950">{value}</p>
        <p className="mt-1 truncate text-xs text-ink-500">{helper}</p>
      </div>
      <div className="mt-3 h-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={makeSparkline(numeric)} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <Area
              type="monotone"
              dataKey="value"
              stroke={style.stroke}
              strokeWidth={2}
              fill={style.area}
              fillOpacity={0.45}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="card flex min-h-[220px] flex-col items-center justify-center p-6 text-center">
      <Sparkles className="h-7 w-7 text-ink-300" />
      <h3 className="mt-3 text-sm font-semibold text-ink-800">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-500">{body}</p>
    </div>
  );
}

export function DashboardPage() {
  const { data: status, isLoading, error, refetch, isFetching } = useVaultStatus();
  const reindex = useReindex();
  const retryPush = useRetryPush();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-ink-300" />
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="card flex items-center gap-3 p-6 text-red-600">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <span>Failed to load vault status. Check your API key and server connection.</span>
      </div>
    );
  }

  const noteTypeData = Object.entries(status.note_type_counts)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const tagData = Object.entries(status.tag_frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, value]) => ({ name, value }));

  const paraData = Object.entries(status.para_folder_counts)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name: cleanFolderName(name), value }));

  const topNoteType = noteTypeData[0];
  const topFolder = paraData[0];
  const topTagCount = tagData[0]?.value ?? 0;
  const isBusy = isFetching || reindex.isPending || retryPush.isPending;

  return (
    <div className="animate-fade-in space-y-5 pb-4">
      <section className="overflow-hidden rounded-xl border border-vault-100 bg-white shadow-sm">
        <div
          className="p-4 sm:p-5"
          style={{
            background:
              "linear-gradient(135deg, rgba(47,95,255,0.12), rgba(22,163,74,0.08) 46%, rgba(217,119,6,0.10))",
          }}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                    status.index_push_pending
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  )}
                >
                  {status.index_push_pending ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  {status.index_push_pending ? "Sync pending" : "Vault index synced"}
                </span>
                <span className="text-xs font-medium text-ink-500">
                  Last push {formatDate(status.last_index_push)}
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-semibold text-ink-950 sm:text-3xl">Dashboard</h1>
              <p className="mt-1 max-w-2xl text-sm text-ink-600">
                Your vault at a glance: notes, tags, PARA folders, recent saves, and index health.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link to="/save" className="btn-primary inline-flex items-center gap-2 text-sm">
                <FilePlus2 className="h-4 w-4" />
                New Note
              </Link>
              {status.index_push_pending && (
                <button
                  onClick={() => retryPush.mutate()}
                  disabled={isBusy}
                  className="btn-secondary inline-flex items-center gap-2 text-sm"
                >
                  <RotateCcw className={cn("h-4 w-4", retryPush.isPending && "animate-spin")} />
                  Retry Push
                </button>
              )}
              <button
                onClick={() => refetch()}
                disabled={isBusy}
                className="btn-secondary inline-flex items-center gap-2 text-sm"
              >
                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-px bg-ink-100 sm:grid-cols-3">
          <div className="bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Last Note</p>
            <p className="mt-1 truncate text-sm font-semibold text-ink-900">{status.last_note || "No notes yet"}</p>
            <p className="mt-1 text-xs text-ink-500">{formatDate(status.last_saved_at)}</p>
          </div>
          <div className="bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Strongest Folder</p>
            <p className="mt-1 truncate text-sm font-semibold text-ink-900">{topFolder?.name || "No folders yet"}</p>
            <p className="mt-1 text-xs text-ink-500">
              {topFolder ? `${topFolder.value} notes, ${percentage(topFolder.value, status.total_notes)} of vault` : "Waiting for index data"}
            </p>
          </div>
          <div className="bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Index Health</p>
            <p className={cn("mt-1 truncate text-sm font-semibold", status.last_error ? "text-red-600" : "text-emerald-700")}>
              {status.last_error || "No errors reported"}
            </p>
            <p className="mt-1 text-xs text-ink-500">
              {status.index_push_pending ? "Action needed" : "Ready for your VPS flow"}
            </p>
          </div>
        </div>
      </section>

      {status.index_push_pending && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold">Index push is pending.</p>
            <p className="break-words text-amber-700">{status.last_error || "Retry the push once GitHub or the network is ready."}</p>
          </div>
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Notes" value={status.total_notes} helper={topNoteType ? `${topNoteType.name} leads note types` : "Ready for your first note"} icon={FileText} tone="blue" />
        <MetricCard label="Tags" value={status.total_tags} helper={tagData[0] ? `Top tag used ${topTagCount} times` : "No tag data yet"} icon={Tag} tone="emerald" />
        <MetricCard label="Saved via App" value={status.total_saved_via_app} helper="Created from this interface" icon={Download} tone="amber" />
        <MetricCard label="Orphan Notes" value={status.orphan_count} helper="Notes without backlinks" icon={GitBranch} tone="rose" />
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink-900">Note Types</h2>
              <p className="text-xs text-ink-500">Distribution across your indexed vault.</p>
            </div>
            <button
              onClick={() => reindex.mutate()}
              disabled={isBusy}
              className="btn-secondary inline-flex items-center gap-2 px-3 py-2 text-xs"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", reindex.isPending && "animate-spin")} />
              Reindex
            </button>
          </div>
          {noteTypeData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={noteTypeData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid #d9d9de", fontSize: 12 }}
                    cursor={{ fill: "rgba(47,95,255,0.06)" }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {noteTypeData.map((entry, index) => (
                      <Cell key={entry.name} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyPanel title="No note type data" body="Run an index after your first notes are saved." />
          )}
        </div>

        <div className="card p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-ink-900">PARA Folders</h2>
          <p className="text-xs text-ink-500">Folder balance from the vault index.</p>
          {paraData.length > 0 ? (
            <>
              <div className="mt-4 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paraData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="58%"
                      outerRadius="84%"
                      paddingAngle={3}
                      isAnimationActive={false}
                    >
                      {paraData.map((entry, index) => (
                        <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "1px solid #d9d9de", fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 grid gap-2">
                {paraData.slice(0, 5).map((folder, index) => (
                  <div key={folder.name} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                      <span className="truncate text-ink-700">{folder.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-ink-500">{folder.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyPanel title="No PARA data" body="Folder counts will appear after the vault index is generated." />
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)]">
        <div className="card p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-vault-500" />
            <h2 className="text-sm font-semibold text-ink-900">Top Tags</h2>
          </div>
          {tagData.length > 0 ? (
            <div className="space-y-3">
              {tagData.map(({ name, value }) => (
                <div key={name}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-semibold text-ink-700">#{name}</span>
                    <span className="text-ink-400">{value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-vault-500"
                      style={{ width: percentage(value, topTagCount) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel title="No tags yet" body="Tags from saved notes will show up here." />
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-ink-100 p-4 sm:p-5">
            <div>
              <h2 className="text-sm font-semibold text-ink-900">Recent Notes</h2>
              <p className="text-xs text-ink-500">Latest indexed notes from your vault.</p>
            </div>
            <Link to="/save" className="inline-flex items-center gap-1 text-xs font-semibold text-vault-600">
              Add
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {status.recent_notes.length > 0 ? (
            <div className="divide-y divide-ink-100">
              {status.recent_notes.slice(0, 8).map((note) => (
                <div key={`${note.filename}-${note.timestamp}`} className="flex gap-3 p-4">
                  <span className={cn("mt-0.5 shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold", noteTypeColor(note.note_type))}>
                    {note.note_type}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{note.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(note.timestamp)}
                      </span>
                      {note.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-vault-600">#{tag}</span>
                      ))}
                      {note.photos.length > 0 && <span>{note.photos.length} attachments</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel title="No recent notes" body="Save a note and it will appear here immediately." />
          )}
        </div>
      </section>
    </div>
  );
}
