import { AlertTriangle, RefreshCw, FileText, Tag, Download, Clock, GitBranch } from "lucide-react";
import { useVaultStatus } from "@/hooks/useVault";
import { cn, formatDate, noteTypeColor } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

function StatCard({ label, value, icon: Icon, sub }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-500 uppercase tracking-wide">{label}</span>
        <Icon className="w-4 h-4 text-ink-300" />
      </div>
      <p className="text-2xl font-semibold text-ink-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-ink-400">{sub}</p>}
    </div>
  );
}

const BAR_COLORS = ["#2f5fff", "#5885ff", "#91b2ff", "#c0d3ff", "#1230e8", "#1a3fff"];

export function DashboardPage() {
  const { data: status, isLoading, error, refetch } = useVaultStatus();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-ink-300 animate-spin" />
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="card p-6 flex items-center gap-3 text-red-600">
        <AlertTriangle className="w-5 h-5" />
        <span>Failed to load vault status. Check your API key and server connection.</span>
      </div>
    );
  }

  const noteTypeData = Object.entries(status.note_type_counts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  const tagData = Object.entries(status.tag_frequency)
    .slice(0, 12)
    .map(([name, value]) => ({ name, value }));

  const paraData = Object.entries(status.para_folder_counts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name: name.split("_").slice(1).join(" ") || name, value }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Dashboard</h1>
          <p className="text-sm text-ink-500 mt-0.5">Obsidian vault overview</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary text-xs gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Push pending warning */}
      {status.index_push_pending && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Index push is pending. <strong>{status.last_error}</strong></span>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Notes" value={status.total_notes} icon={FileText} />
        <StatCard label="Total Tags" value={status.total_tags} icon={Tag} />
        <StatCard label="Saved via App" value={status.total_saved_via_app} icon={Download} />
        <StatCard label="Orphan Notes" value={status.orphan_count} icon={GitBranch} sub="no backlinks" />
      </div>

      {/* Last activity */}
      <div className="card p-4 space-y-3">
        <h2 className="text-sm font-semibold text-ink-700">Last Activity</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-ink-400 mb-0.5">Last note saved</p>
            <p className="font-medium text-ink-800 truncate">{status.last_note || "—"}</p>
            <p className="text-xs text-ink-400">{formatDate(status.last_saved_at)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-400 mb-0.5">Last index push</p>
            <p className="text-xs text-ink-500">{formatDate(status.last_index_push)}</p>
            <span className={cn(
              "inline-flex items-center gap-1 mt-1 text-xs px-2 py-0.5 rounded-md font-medium",
              status.index_push_pending
                ? "bg-orange-100 text-orange-700"
                : "bg-green-100 text-green-700"
            )}>
              {status.index_push_pending ? "Pending" : "Up to date"}
            </span>
          </div>
          <div>
            <p className="text-xs text-ink-400 mb-0.5">Last error</p>
            <p className="text-xs text-red-500 break-all">{status.last_error || "None"}</p>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Note types */}
        {noteTypeData.length > 0 && (
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-ink-700 mb-3">Note Types</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={noteTypeData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #d9d9de", fontSize: 12 }}
                  cursor={{ fill: "rgba(47,95,255,0.06)" }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {noteTypeData.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* PARA folders */}
        {paraData.length > 0 && (
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-ink-700 mb-3">PARA Folders</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={paraData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "1px solid #d9d9de", fontSize: 12 }}
                  cursor={{ fill: "rgba(47,95,255,0.06)" }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#91b2ff" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top tags */}
      {tagData.length > 0 && (
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-ink-700 mb-3">Top Tags</h2>
          <div className="flex flex-wrap gap-2">
            {tagData.map(({ name, value }) => (
              <span key={name} className="tag-chip">
                #{name} <span className="opacity-60">·{value}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent notes */}
      {status.recent_notes.length > 0 && (
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-ink-700 mb-3">Recent Notes</h2>
          <div className="space-y-2">
            {status.recent_notes.map((note, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-ink-100 last:border-0">
                <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium shrink-0", noteTypeColor(note.note_type))}>
                  {note.note_type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-800 truncate">{note.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Clock className="w-3 h-3 text-ink-300" />
                    <span className="text-xs text-ink-400">{formatDate(note.timestamp)}</span>
                    {note.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs text-vault-500">#{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
