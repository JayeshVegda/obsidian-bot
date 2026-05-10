import { useState } from "react";
import { Copy, CheckCheck, BookOpen, RefreshCw } from "lucide-react";
import { usePrompts } from "@/hooks/useVault";
import { toast } from "@/components/ui/Toaster";
import { cn } from "@/lib/utils";

export function PromptsPage() {
  const { data: prompts, isLoading } = usePrompts();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  function copyPrompt(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast("success", "Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-ink-300 animate-spin" />
      </div>
    );
  }

  if (!prompts?.length) {
    return (
      <div className="card p-8 text-center text-ink-400">
        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>No prompts configured</p>
      </div>
    );
  }

  const active = prompts.find((p) => p.id === activeId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">AI Prompts</h1>
        <p className="text-sm text-ink-500 mt-0.5">Use these with Claude or any AI to generate structured notes</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {prompts.map((prompt) => (
          <div
            key={prompt.id}
            className={cn(
              "card p-4 cursor-pointer transition-all",
              activeId === prompt.id
                ? "border-vault-400 shadow-md shadow-vault-100"
                : "hover:border-ink-300"
            )}
            onClick={() => setActiveId(activeId === prompt.id ? null : prompt.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-ink-900 text-sm">{prompt.label}</p>
                <p className="text-xs text-ink-500 mt-0.5">{prompt.description}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); copyPrompt(prompt.id, prompt.prompt); }}
                className="shrink-0 p-1.5 rounded-md hover:bg-ink-100 text-ink-400 hover:text-ink-700 transition-colors"
              >
                {copiedId === prompt.id ? (
                  <CheckCheck className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {active && (
        <div className="card p-4 space-y-3 animate-slide-up">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-700">{active.label} Prompt</h2>
            <button
              onClick={() => copyPrompt(active.id, active.prompt)}
              className="btn-secondary text-xs gap-1.5"
            >
              {copiedId === active.id ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedId === active.id ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="text-xs text-ink-700 whitespace-pre-wrap font-mono bg-ink-50 rounded-lg p-3 border border-ink-200 overflow-auto max-h-80">
            {active.prompt}
          </pre>
        </div>
      )}
    </div>
  );
}
