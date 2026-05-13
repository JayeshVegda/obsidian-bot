import { useState, useRef } from "react";
import { File as FileIcon, FileText, Trash2, Upload, Copy, RefreshCw, Check } from "lucide-react";
import { usePhotos, useUploadPhoto, useDeletePhoto } from "@/hooks/useVault";
import { toast } from "@/components/ui/Toaster";
import { formatDate, formatBytes, cn } from "@/lib/utils";

/** Copy text with a fallback for HTTP (no clipboard API) */
async function copyWithFallback(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // HTTP fallback — create a hidden textarea and execCommand
    const el = document.createElement("textarea");
    el.value = text;
    el.style.cssText = "position:fixed;top:-9999px;left:-9999px;opacity:0";
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export function PhotosPage() {
  const { data: photos, isLoading, refetch } = usePhotos(50);
  const uploadPhoto = useUploadPhoto();
  const deletePhoto = useDeletePhoto();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  // For HTTP fallback: show the text to copy inline
  const [fallbackText, setFallbackText] = useState<{ path: string; text: string; label: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const isUploading = uploadPhoto.isPending || uploadingCount > 0;

  async function copyText(text: string, label: string, photoPath: string) {
    const ok = await copyWithFallback(text);
    if (ok) {
      const key = `${photoPath}-${label}`;
      setCopiedKey(key);
      toast("success", `Copied ${label}`);
      setTimeout(() => setCopiedKey(null), 2000);
    } else {
      // Can't copy — show the text inline for manual copy
      setFallbackText({ path: photoPath, text, label });
    }
  }

  function readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1] || "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function isImageAttachment(mimeType = "", filename = ""): boolean {
    return mimeType.startsWith("image/") || /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(filename);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingCount(files.length);
    let uploaded = 0;
    const failed: string[] = [];

    for (const [index, file] of files.entries()) {
      try {
        const base64 = await readFileAsBase64(file);
        await uploadPhoto.mutateAsync({
          file_base64: base64,
          original_name: file.name,
          mime_type: file.type,
          attachment_index: index,
        });
        uploaded += 1;
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } } };
        failed.push(e.response?.data?.message || file.name);
      } finally {
        setUploadingCount((count) => Math.max(0, count - 1));
      }
    }

    if (uploaded) {
      toast("success", "Upload complete", `${uploaded} file${uploaded === 1 ? "" : "s"} stored`);
    }
    if (failed.length) {
      toast("error", "Some files failed", failed.slice(0, 2).join("; "));
    }
    e.target.value = "";
  }

  async function handleDelete(relativePath: string) {
    if (!confirm("Delete this attachment?")) return;
    setDeletingPath(relativePath);
    try {
      await deletePhoto.mutateAsync(relativePath);
      toast("success", "Attachment deleted");
      if (fallbackText?.path === relativePath) setFallbackText(null);
    } catch {
      toast("error", "Delete failed");
    } finally {
      setDeletingPath(null);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink-900">Docs</h1>
          <p className="text-sm text-ink-500 mt-0.5">Upload files directly into your vault attachments folder</p>
        </div>
        <button onClick={() => refetch()} className="btn-secondary text-xs gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Upload panel */}
      <div className="card p-4 space-y-3">
        <p className="text-sm font-medium text-ink-700">Upload Documents</p>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            {isUploading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {isUploading ? `Uploading ${uploadingCount || ""}`.trim() : "Choose Files"}
          </button>
          <p className="text-xs text-ink-400">Select one or more files. PDFs, Office docs, text, markdown, CSV, JSON, zips, and images are supported.</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>

      {/* HTTP fallback copy panel */}
      {fallbackText && (
        <div className="card p-4 space-y-2 border-amber-200 bg-amber-50">
          <p className="text-xs font-medium text-amber-700">
            Clipboard not available over HTTP — copy manually:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-white border border-amber-200 rounded px-2 py-1.5 text-ink-800 break-all">
              {fallbackText.text}
            </code>
            <button
              onClick={() => setFallbackText(null)}
              className="text-amber-500 hover:text-amber-700 p-1"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Photos grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <RefreshCw className="w-6 h-6 text-ink-300 animate-spin" />
        </div>
      ) : !photos?.length ? (
        <div className="card p-12 text-center text-ink-400">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No attachments yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {photos.map((photo) => {
            const embedKey = `${photo.relative_path}-embed`;
            const wikiKey = `${photo.relative_path}-wiki`;
            const isImage = isImageAttachment(photo.mime_type, photo.filename);
            return (
              <div key={photo.relative_path} className="card p-3 space-y-2">
                {/* Preview */}
                <div className="h-36 rounded-lg bg-ink-100 overflow-hidden flex items-center justify-center">
                  {isImage ? (
                    <img
                      src={`/api/photos/file/${encodeURIComponent(photo.relative_path)}`}
                      alt={photo.filename}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-ink-400">
                      <FileIcon className="w-10 h-10" />
                      <span className="text-xs font-medium uppercase">{photo.filename.split(".").pop() || "file"}</span>
                    </div>
                  )}
                </div>

                {/* Meta */}
                <div>
                  <p className="text-sm font-medium text-ink-800 truncate">{photo.filename}</p>
                  <p className="text-xs text-ink-400">
                    {formatBytes(photo.size_bytes)} · {formatDate(photo.modified_at)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => copyText(photo.embed_link, "embed link", photo.relative_path)}
                    className="btn-secondary text-xs flex-1 gap-1"
                  >
                    {copiedKey === embedKey ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    Embed
                  </button>
                  <button
                    onClick={() => copyText(photo.wikilink, "wikilink", photo.relative_path)}
                    className="btn-secondary text-xs flex-1 gap-1"
                  >
                    {copiedKey === wikiKey ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    Wiki
                  </button>
                  <button
                    onClick={() => handleDelete(photo.relative_path)}
                    disabled={deletingPath === photo.relative_path}
                    className={cn(
                      "p-2 rounded-lg border text-sm transition-colors",
                      "border-red-200 text-red-500 hover:bg-red-50"
                    )}
                  >
                    {deletingPath === photo.relative_path ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
