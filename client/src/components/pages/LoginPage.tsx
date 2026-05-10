import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Vault, Key, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useTestKey } from "@/hooks/useVault";
import { toast } from "@/components/ui/Toaster";

export function LoginPage() {
  const [key, setKey] = useState("");
  const navigate = useNavigate();
  const setApiKey = useAuthStore((s) => s.setApiKey);
  const testKey = useTestKey();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;

    // Temporarily set the key so the interceptor can use it
    setApiKey(key.trim());
    try {
      await testKey.mutateAsync();
      toast("success", "Authenticated", "Welcome to Vault Bot");
      navigate("/");
    } catch {
      useAuthStore.getState().clearApiKey();
      toast("error", "Invalid API key", "Check your key and try again");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-vault-500 mb-4 shadow-lg shadow-vault-500/20">
            <Vault className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-ink-900">Vault Bot</h1>
          <p className="text-sm text-ink-500 mt-1">Enter your API key to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">
              API Key
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="your-secret-api-key"
                className="input pl-9"
                autoFocus
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={!key.trim() || testKey.isPending}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {testKey.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            {testKey.isPending ? "Verifying…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-xs text-ink-400 mt-4">
          Set via <code className="font-mono bg-ink-100 px-1 rounded">API_SECRET_KEY</code> in your <code className="font-mono bg-ink-100 px-1 rounded">.env</code>
        </p>
      </div>
    </div>
  );
}
