import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FilePlus,
  FileText,
  Settings,
  LogOut,
  Vault,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { useReindex, useRetryPush, useVaultStatus } from "@/hooks/useVault";
import { toast } from "@/components/ui/Toaster";

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/save", icon: FilePlus, label: "Save Note" },
  { to: "/photos", icon: FileText, label: "Docs" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Layout() {
  const navigate = useNavigate();
  const clearApiKey = useAuthStore((s) => s.clearApiKey);
  const { data: status } = useVaultStatus();
  const reindex = useReindex();
  const retryPush = useRetryPush();

  function handleLogout() {
    clearApiKey();
    navigate("/login");
  }

  async function handleReindex() {
    if (!confirm("Reindex the full vault? This may take a moment.")) return;
    try {
      const res = await reindex.mutateAsync();
      toast("success", "Reindex complete", `${res.data.total_notes} notes indexed`);
    } catch {
      toast("error", "Reindex failed");
    }
  }

  async function handleRetryPush() {
    try {
      const res = await retryPush.mutateAsync();
      toast(res.data.status === "success" ? "success" : "error", res.data.message);
    } catch {
      toast("error", "Retry push failed");
    }
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-ink-100">
        <div className="w-7 h-7 rounded-lg bg-vault-500 flex items-center justify-center">
          <Vault className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-ink-900 text-sm tracking-tight">Vault Bot</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn("nav-link", isActive && "active")}
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Actions */}
      <div className="p-3 border-t border-ink-100 space-y-1">
        {status?.index_push_pending && (
          <button
            onClick={handleRetryPush}
            disabled={retryPush.isPending}
            className="nav-link w-full text-orange-600 hover:bg-orange-50 hover:text-orange-700"
          >
            <RotateCcw className={cn("w-4 h-4", retryPush.isPending && "animate-spin")} />
            Retry Push
          </button>
        )}
        <button
          onClick={handleReindex}
          disabled={reindex.isPending}
          className="nav-link w-full text-ink-600 hover:text-ink-900 hover:bg-ink-100"
        >
          <RefreshCw className={cn("w-4 h-4", reindex.isPending && "animate-spin")} />
          Reindex
        </button>
        <button
          onClick={handleLogout}
          className="nav-link w-full text-ink-500 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

      {/* Status footer */}
      {status && (
        <div className="px-4 pb-3">
          <p className="text-xs text-ink-400">
            {status.total_notes} notes · {status.total_tags} tags
          </p>
        </div>
      )}
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Desktop sidebar ──────────────────────────────────────────── */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-ink-200 bg-white">
        {sidebarContent}
      </aside>

      {/* ── Main area ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-ink-200 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-vault-500 flex items-center justify-center">
              <Vault className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-ink-900 text-sm">Vault Bot</span>
          </div>
          {status?.index_push_pending && (
            <button
              onClick={handleRetryPush}
              disabled={retryPush.isPending}
              className="ml-auto p-1.5 rounded-lg text-orange-500 hover:bg-orange-50"
              title="Retry push"
            >
              <RotateCcw className={cn("w-4 h-4", retryPush.isPending && "animate-spin")} />
            </button>
          )}
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8">
            <Outlet />
          </div>
        </main>

        {/* ── Mobile bottom nav ─────────────────────────────────────── */}
        <nav className="md:hidden shrink-0 flex border-t border-ink-200 bg-white safe-area-bottom">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
                  isActive ? "text-vault-600" : "text-ink-400 hover:text-ink-700"
                )
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
