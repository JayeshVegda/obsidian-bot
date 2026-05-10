import { useState } from "react";
import { Settings, Key, ExternalLink, Server, RefreshCw } from "lucide-react";
import { useVaultConfig } from "@/hooks/useVault";
import { useAuthStore } from "@/store/auth";
import { useTestKey } from "@/hooks/useVault";
import { toast } from "@/components/ui/Toaster";

export function SettingsPage() {
  const { data: config, isLoading } = useVaultConfig();
  const { apiKey, setApiKey } = useAuthStore();
  const testKey = useTestKey();
  const [newKey, setNewKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  async function handleUpdateKey() {
    if (!newKey.trim()) return;
    const old = apiKey;
    setApiKey(newKey.trim());
    try {
      await testKey.mutateAsync();
      toast("success", "API key updated");
      setNewKey("");
    } catch {
      setApiKey(old);
      toast("error", "Invalid API key", "Reverted to previous key");
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-xl">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Settings</h1>
        <p className="text-sm text-ink-500 mt-0.5">Configuration and connection info</p>
      </div>

      {/* API Key */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-ink-400" />
          <h2 className="text-sm font-semibold text-ink-700">API Key</h2>
        </div>
        <div>
          <p className="text-xs text-ink-400 mb-2">Current key</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-ink-50 border border-ink-200 rounded-lg px-3 py-2 truncate text-ink-600">
              {showKey ? apiKey : "•".repeat(Math.min(apiKey.length, 32))}
            </code>
            <button
              onClick={() => setShowKey((v) => !v)}
              className="btn-secondary text-xs px-2.5"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-ink-400">Update key</p>
          <div className="flex gap-2">
            <input
              type="password"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="New API key"
              className="input flex-1"
            />
            <button
              onClick={handleUpdateKey}
              disabled={!newKey.trim() || testKey.isPending}
              className="btn-primary text-sm gap-1.5"
            >
              {testKey.isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              Update
            </button>
          </div>
        </div>
      </div>

      {/* Server config */}
      {isLoading ? (
        <div className="card p-6 flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-ink-300 animate-spin" />
        </div>
      ) : config ? (
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-ink-400" />
            <h2 className="text-sm font-semibold text-ink-700">Server Configuration</h2>
            <span className="ml-auto text-xs text-ink-400 font-mono">v{config.server_version}</span>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-ink-400 mb-1">Valid Note Types</p>
              <div className="flex flex-wrap gap-1.5">
                {config.valid_note_types.map((t) => (
                  <span key={t} className="tag-chip">{t}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-ink-400 mb-1">PARA Folders</p>
              <div className="flex flex-wrap gap-1.5">
                {config.valid_para_folders.map((f) => (
                  <span key={f} className="tag-chip">{f}</span>
                ))}
              </div>
            </div>
            {config.vault_index_github_url && (
              <div>
                <p className="text-xs text-ink-400 mb-1">Vault Index</p>
                <a
                  href={config.vault_index_github_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-vault-600 hover:underline font-mono"
                >
                  <ExternalLink className="w-3 h-3" />
                  {config.vault_index_github_url}
                </a>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Info */}
      <div className="card p-5 space-y-3 bg-ink-50">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-ink-400" />
          <h2 className="text-sm font-semibold text-ink-700">Configuration Files</h2>
        </div>
        <div className="space-y-2 text-xs text-ink-500 font-mono">
          <p><span className="text-ink-700">.env</span> — secrets (API key, paths)</p>
          <p><span className="text-ink-700">config.yaml</span> — vault behavior</p>
          <p><span className="text-ink-700">prompts.yaml</span> — AI prompt templates</p>
        </div>
      </div>
    </div>
  );
}
