import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/Toaster";
import { useAuthStore } from "./store/auth";
import { LoginPage } from "./components/pages/LoginPage";
import { Layout } from "./components/layout/Layout";
import { DashboardPage } from "./components/pages/DashboardPage";
import { SaveNotePage } from "./components/pages/SaveNotePage";
import { PhotosPage } from "./components/pages/PhotosPage";
import { SettingsPage } from "./components/pages/SettingsPage";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <AuthGuard>
              <Layout />
            </AuthGuard>
          }
        >
          <Route index element={<Navigate to="/save" replace />} />
          <Route path="save" element={<SaveNotePage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="photos" element={<PhotosPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}
