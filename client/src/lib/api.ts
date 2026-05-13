import axios, { AxiosError } from "axios";
import { useAuthStore } from "@/store/auth";

export const apiClient = axios.create({
  baseURL: "/api",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Inject API key into every request
apiClient.interceptors.request.use((config) => {
  const apiKey = useAuthStore.getState().apiKey;
  if (apiKey) {
    config.headers["X-API-Key"] = apiKey;
  }
  return config;
});

// Normalize errors
apiClient.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().clearApiKey();
    }
    return Promise.reject(err);
  }
);

// ── Types ────────────────────────────────────────────────────────────────────

export interface NotePayload {
  title: string;
  tags: string[];
  backlinks: string[];
  note_type: string;
  para_suggestion: string;
  created_date: string;
  content: string;
  photos?: string[];
}

export interface SaveNoteResponse {
  status: string;
  filename: string;
  tags: string[];
  backlinks: string[];
  para_suggestion: string;
  note_type: string;
  index_pushed: boolean;
}

export interface VaultStatus {
  total_notes: number;
  total_tags: number;
  total_saved_via_app: number;
  note_type_counts: Record<string, number>;
  para_folder_counts: Record<string, number>;
  tag_frequency: Record<string, number>;
  orphan_count: number;
  last_note: string | null;
  last_saved_at: string | null;
  last_index_push: string | null;
  last_error: string;
  index_push_pending: boolean;
  recent_notes: RecentNote[];
}

export interface RecentNote {
  filename: string;
  title: string;
  note_type: string;
  tags: string[];
  photos: string[];
  timestamp: string;
}

export interface VaultConfig {
  vault_index_github_url: string;
  server_version: string;
  valid_note_types: string[];
  valid_para_folders: string[];
}

export interface PathStatus {
  path: string;
  exists: boolean;
  type: string;
}

export interface GitRepoStatus {
  path: string;
  exists: boolean;
  is_repo: boolean;
  branch: string;
  remote: string;
  clean: boolean | null;
  error: string;
}

export interface AppSettings {
  server_version: string;
  node_env: string;
  host: string;
  port: number;
  cors_origins: string[];
  paths: {
    project_root: PathStatus;
    vault: PathStatus;
    attachments_folder: PathStatus;
    vault_index: PathStatus;
    github_repo: GitRepoStatus;
    bot_state_file: PathStatus;
    retry_state_file: PathStatus;
  };
  index: {
    raw_url: string;
    local_or_remote_path: string;
    is_remote: boolean;
    repo_path: string;
  };
  config: {
    quick_notes_folder: string;
    attachments_folder: string;
    max_attachment_size_bytes: number;
    allowed_attachment_types: string[];
    valid_note_types: string[];
    valid_para_folders: string[];
  };
}

export interface Photo {
  filename: string;
  relative_path: string;
  mime_type?: string;
  size_bytes: number;
  modified_at: string;
  embed_link: string;
  wikilink: string;
}

// ── API functions ─────────────────────────────────────────────────────────────

export const api = {
  health: () => apiClient.get<{ status: string; version: string }>("/health"),

  testKey: () => apiClient.get<{ status: string; message: string }>("/test-key"),

  getConfig: () => apiClient.get<VaultConfig>("/config"),

  getSettings: () => apiClient.get<AppSettings>("/settings"),

  getStatus: () => apiClient.get<VaultStatus>("/status"),

  saveNote: (payload: NotePayload) =>
    apiClient.post<SaveNoteResponse>("/notes", payload),

  reindex: () => apiClient.post<{ status: string; total_notes: number; total_tags: number; orphan_count: number; index_pushed: boolean; message: string }>("/index/reindex"),

  retryPush: () => apiClient.post<{ status: string; message: string }>("/index/retry-push"),

  getPhotos: (limit = 20) => apiClient.get<{ status: string; photos: Photo[] }>(`/photos?limit=${limit}`),

  uploadPhoto: (data: {
    photo_base64?: string;
    note_title?: string;
    photo_index?: number;
    file_base64?: string;
    original_name?: string;
    mime_type?: string;
    attachment_index?: number;
  }) =>
    apiClient.post<{ status: string; relative_path: string; embed_link: string; wikilink: string; filename: string; size_bytes: number }>("/photos/upload", data),

  deletePhoto: (photo_path: string) =>
    apiClient.delete<{ status: string; message: string }>("/photos", { data: { photo_path } }),
};
