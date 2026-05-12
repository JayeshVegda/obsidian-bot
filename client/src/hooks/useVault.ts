import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type NotePayload } from "@/lib/api";

export const QUERY_KEYS = {
  status: ["status"] as const,
  config: ["config"] as const,
  photos: (limit?: number) => ["photos", limit] as const,
};

export function useVaultStatus() {
  return useQuery({
    queryKey: QUERY_KEYS.status,
    queryFn: async () => {
      const res = await api.getStatus();
      return res.data;
    },
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}

export function useVaultConfig() {
  return useQuery({
    queryKey: QUERY_KEYS.config,
    queryFn: async () => {
      const res = await api.getConfig();
      return res.data;
    },
    staleTime: Infinity,
  });
}

export function usePhotos(limit = 20) {
  return useQuery({
    queryKey: QUERY_KEYS.photos(limit),
    queryFn: async () => {
      const res = await api.getPhotos(limit);
      return res.data.photos;
    },
    staleTime: 30_000,
  });
}

export function useSaveNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: NotePayload) => api.saveNote(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.status });
    },
  });
}

export function useReindex() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.reindex(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.status });
    },
  });
}

export function useRetryPush() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.retryPush(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.status });
    },
  });
}

export function useUploadPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { photo_base64: string; note_title: string; photo_index: number }) =>
      api.uploadPhoto(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["photos"] });
    },
  });
}

export function useDeletePhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (photo_path: string) => api.deletePhoto(photo_path),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["photos"] });
    },
  });
}

export function useTestKey() {
  return useMutation({
    mutationFn: () => api.testKey(),
  });
}
