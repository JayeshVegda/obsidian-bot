import {
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Folder,
  GitBranch,
  HardDrive,
  RefreshCw,
  Server,
  Settings,
} from "lucide-react";
import { useAppSettings, useRetryPush, useVaultStatus } from "@/hooks/useVault";
import { formatBytes, formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/Toaster";

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700",
      ].join(" ")}
    >
      {ok ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      {label}
    </span>
  );
}

function PathRow({
  label,
  value,
  ok,
  detail,
}: {
  label: string;
  value: string;
  ok: boolean;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white px-3 py-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-ink-500">{label}</p>
        <StatusPill ok={ok} label={ok ? "OK" : "Check"} />
      </div>
      <p className="break-all font-mono text-xs text-ink-800">{value || "-"}</p>
      {detail && <p className="mt-1 text-xs text-ink-400">{detail}</p>}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-ink-400" />
        <h2 className="text-sm font-semibold text-ink-700">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function SettingsPage() {
  const { data: settings, isLoading, refetch } = useAppSettings();
  const { data: status, refetch: refetchStatus } = useVaultStatus();
  const retryPush = useRetryPush();

  async function handleRetryPush() {
    try {
      const res = await retryPush.mutateAsync();
      toast(res.data.status === "success" ? "success" : "error", res.data.message);
      refetchStatus();
    } catch {
      toast("error", "Retry push failed");
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-ink-300" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="card p-6 flex items-center gap-3 text-red-600">
        <AlertTriangle className="h-5 w-5" />
        <span>Failed to load settings.</span>
      </div>
    );
  }

  const repo = settings.paths.github_repo;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Settings</h1>
          <p className="mt-0.5 text-sm text-ink-500">Vault paths, index sync, and runtime checks</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary text-xs gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <Section icon={GitBranch} title="Vault Index Sync">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PathRow
            label="Index path"
            value={settings.index.local_or_remote_path}
            ok={settings.paths.vault_index.exists}
            detail={settings.index.is_remote ? "Remote raw index URL" : settings.paths.vault_index.type}
          />
          <PathRow
            label="GitHub repo"
            value={repo.path}
            ok={repo.exists && repo.is_repo}
            detail={repo.is_repo ? `branch ${repo.branch || "-"} · ${repo.clean ? "clean" : "local changes"}` : repo.error}
          />
        </div>

        {settings.index.raw_url && (
          <a
            href={settings.index.raw_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 break-all font-mono text-xs text-vault-600 hover:underline"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            {settings.index.raw_url}
          </a>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <StatusPill ok={!status?.index_push_pending} label={status?.index_push_pending ? "Push pending" : "Push OK"} />
          <span className="text-ink-400">Last push: {formatDate(status?.last_index_push ?? null)}</span>
          {status?.index_push_pending && (
            <button
              onClick={handleRetryPush}
              disabled={retryPush.isPending}
              className="btn-secondary text-xs gap-1.5"
            >
              <RefreshCw className={["h-3.5 w-3.5", retryPush.isPending ? "animate-spin" : ""].join(" ")} />
              Retry Push
            </button>
          )}
        </div>

        {repo.remote && <p className="break-all font-mono text-xs text-ink-500">origin: {repo.remote}</p>}
        {status?.last_error && <p className="break-all text-xs text-red-500">{status.last_error}</p>}
      </Section>

      <Section icon={Folder} title="Local Paths">
        <div className="grid grid-cols-1 gap-3">
          <PathRow label="Project root" value={settings.paths.project_root.path} ok={settings.paths.project_root.exists} detail={settings.paths.project_root.type} />
          <PathRow label="Obsidian vault" value={settings.paths.vault.path} ok={settings.paths.vault.exists} detail={settings.paths.vault.type} />
          <PathRow label="Attachments folder" value={settings.paths.attachments_folder.path} ok={settings.paths.attachments_folder.exists} detail={settings.paths.attachments_folder.type} />
        </div>
      </Section>

      <Section icon={HardDrive} title="Vault Behavior">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PathRow label="Quick notes folder" value={settings.config.quick_notes_folder} ok={Boolean(settings.config.quick_notes_folder)} />
          <PathRow label="Attachment size limit" value={formatBytes(settings.config.max_attachment_size_bytes)} ok={settings.config.max_attachment_size_bytes > 0} />
        </div>
        <div>
          <p className="mb-1 text-xs text-ink-400">PARA folders</p>
          <div className="flex flex-wrap gap-1.5">
            {settings.config.valid_para_folders.map((folder) => <span key={folder} className="tag-chip">{folder}</span>)}
          </div>
        </div>
      </Section>

      <Section icon={Server} title="Runtime">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PathRow label="Environment" value={settings.node_env} ok={Boolean(settings.node_env)} />
          <PathRow label="Server" value={`${settings.host}:${settings.port}`} ok={settings.port > 0} detail={`v${settings.server_version}`} />
          <PathRow label="Bot state" value={settings.paths.bot_state_file.path} ok={settings.paths.bot_state_file.exists} detail={settings.paths.bot_state_file.type} />
          <PathRow label="Retry state" value={settings.paths.retry_state_file.path} ok={settings.paths.retry_state_file.exists} detail={settings.paths.retry_state_file.type} />
        </div>
      </Section>

      <Section icon={Settings} title="Allowed Attachment Types">
        <div className="flex flex-wrap gap-1.5">
          {settings.config.allowed_attachment_types.map((type) => <span key={type} className="tag-chip">{type}</span>)}
        </div>
      </Section>
    </div>
  );
}
