import { useState, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X, Loader2, CheckCircle, AlertTriangle, ImagePlus, Trash2 } from "lucide-react";
import { useSaveNote, useVaultConfig, useUploadPhoto } from "@/hooks/useVault";
import { toast } from "@/components/ui/Toaster";
import { cn, formatBytes } from "@/lib/utils";
import type { NotePayload } from "@/lib/api";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  note_type: z.string().min(1, "Note type is required"),
  para_suggestion: z.string().min(1, "PARA suggestion is required"),
  created_date: z.string().min(1, "Date is required"),
  content: z.string().min(1, "Content is required"),
  tags: z.array(z.string()).min(1, "At least one tag required"),
  backlinks: z.array(z.string()),
});

type FormData = z.infer<typeof schema>;

interface AttachedPhoto {
  relativePath: string;
  filename: string;
  previewUrl: string;
  sizeBytes: number;
}

function TagInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  function add() {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInput("");
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-ink-700 mb-1.5">{label}</label>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((tag) => (
            <span key={tag} className="tag-chip gap-1">
              {tag}
              <button onClick={() => onChange(value.filter((t) => t !== tag))} type="button">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder || "Type and press Enter"}
          className="input flex-1"
        />
        <button type="button" onClick={add} className="btn-secondary px-3">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function JsonImportSection({
  onImport,
}: {
  onImport: (data: Partial<FormData & { photos: string[] }>) => void;
}) {
  const [json, setJson] = useState("");
  const [error, setError] = useState("");

  function handleImport() {
    try {
      const parsed = JSON.parse(json);
      onImport(parsed);
      setJson("");
      setError("");
      toast("success", "JSON imported", "Form fields populated");
    } catch {
      setError("Invalid JSON — check the format and try again");
    }
  }

  return (
    <div className="card p-4 space-y-3 border-dashed">
      <p className="text-sm font-medium text-ink-600">Paste AI-generated JSON</p>
      <textarea
        value={json}
        onChange={(e) => { setJson(e.target.value); setError(""); }}
        placeholder={'{ "title": "...", "tags": [...], ... }'}
        className="input h-28 resize-none font-mono text-xs"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="button"
        onClick={handleImport}
        disabled={!json.trim()}
        className="btn-secondary text-sm"
      >
        Import JSON
      </button>
    </div>
  );
}

function PhotoAttachSection({
  noteTitle,
  photos,
  onAdd,
  onRemove,
}: {
  noteTitle: string;
  photos: AttachedPhoto[];
  onAdd: (photo: AttachedPhoto) => void;
  onRemove: (relativePath: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadPhoto = useUploadPhoto();
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setUploading(true);
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res((reader.result as string).split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const result = await uploadPhoto.mutateAsync({
        photo_base64: base64,
        note_title: noteTitle || "attachment",
        photo_index: photos.length,
      });
      onAdd({
        relativePath: result.data.relative_path,
        filename: result.data.filename,
        previewUrl,
        sizeBytes: result.data.size_bytes,
      });
      toast("success", "Photo attached", result.data.filename);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast("error", "Upload failed", e.response?.data?.message || "Unknown error");
      URL.revokeObjectURL(previewUrl);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-ink-700 mb-1.5">
        Photos <span className="text-ink-400 font-normal">(optional)</span>
      </label>

      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {photos.map((photo) => (
            <div
              key={photo.relativePath}
              className="relative group w-20 h-20 rounded-lg overflow-hidden border border-ink-200 bg-ink-100 shrink-0"
            >
              <img src={photo.previewUrl} alt={photo.filename} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => onRemove(photo.relativePath)}
                  className="p-1.5 rounded-full bg-red-500 text-white"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                <p className="text-white text-[9px] truncate">{formatBytes(photo.sizeBytes)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={cn("btn-secondary text-sm flex items-center gap-2", uploading && "opacity-50 cursor-not-allowed")}
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
        {uploading ? "Uploading…" : "Attach Photo"}
      </button>
      {/* capture="environment" opens rear camera by default on Android */}
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <p className="text-xs text-ink-400 mt-1.5">Uploaded immediately; embedded in note on save.</p>
    </div>
  );
}

export function SaveNotePage() {
  const { data: config } = useVaultConfig();
  const saveNote = useSaveNote();
  const [attachedPhotos, setAttachedPhotos] = useState<AttachedPhoto[]>([]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      tags: [],
      backlinks: [],
      created_date: new Date().toISOString().split("T")[0],
    },
  });

  const watchedTitle = watch("title", "");

  /** Normalise ISO datetime OR bare date → YYYY-MM-DD for <input type="date"> */
  function toDateValue(raw: string): string {
    if (!raw) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
    return raw;
  }

  function handleJsonImport(data: Partial<FormData & { photos: string[]; [key: string]: unknown }>) {
    if (data.title) setValue("title", data.title);
    if (data.note_type) setValue("note_type", data.note_type);
    if (data.para_suggestion) setValue("para_suggestion", data.para_suggestion);
    if (data.created_date) setValue("created_date", toDateValue(data.created_date));
    if (data.content) setValue("content", data.content);
    if (data.tags) setValue("tags", data.tags);
    if (data.backlinks) setValue("backlinks", data.backlinks);
    // Unknown fields (like "online") are silently ignored — no crash
  }

  function handleRemovePhoto(relativePath: string) {
    setAttachedPhotos((prev) => {
      const photo = prev.find((p) => p.relativePath === relativePath);
      if (photo) URL.revokeObjectURL(photo.previewUrl);
      return prev.filter((p) => p.relativePath !== relativePath);
    });
  }

  async function onSubmit(data: FormData) {
    try {
      const payload: NotePayload = {
        ...data,
        photos: attachedPhotos.map((p) => p.relativePath),
      };
      const res = await saveNote.mutateAsync(payload);
      toast("success", "Note saved", res.data.filename);
      attachedPhotos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setAttachedPhotos([]);
      reset({ tags: [], backlinks: [], created_date: new Date().toISOString().split("T")[0] });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { errors?: string[]; message?: string } } };
      const errs = err.response?.data?.errors;
      if (errs) {
        toast("error", "Validation failed", errs.slice(0, 2).join("; "));
      } else {
        toast("error", "Save failed", err.response?.data?.message || "Unknown error");
      }
    }
  }

  const noteTypes = config?.valid_note_types || [];
  const paraFolders = config?.valid_para_folders || [];

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-ink-900">Save Note</h1>
        <p className="text-sm text-ink-500 mt-0.5">Create a new note in your Obsidian vault</p>
      </div>

      <JsonImportSection onImport={handleJsonImport} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Title *</label>
          <input {...register("title")} className="input" placeholder="Note title" />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
        </div>

        {/* Note type + PARA — single column on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">Note Type *</label>
            <select {...register("note_type")} className="input">
              <option value="">Select type…</option>
              {noteTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.note_type && <p className="text-xs text-red-500 mt-1">{errors.note_type.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">PARA Folder *</label>
            <select {...register("para_suggestion")} className="input">
              <option value="">Select folder…</option>
              {paraFolders.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            {errors.para_suggestion && <p className="text-xs text-red-500 mt-1">{errors.para_suggestion.message}</p>}
          </div>
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Created Date *</label>
          <input {...register("created_date")} type="date" className="input" />
          {errors.created_date && <p className="text-xs text-red-500 mt-1">{errors.created_date.message}</p>}
        </div>

        {/* Tags */}
        <Controller
          name="tags"
          control={control}
          render={({ field }) => (
            <TagInput label="Tags *" value={field.value} onChange={field.onChange} placeholder="Add tag, press Enter" />
          )}
        />
        {errors.tags && <p className="text-xs text-red-500 -mt-3">{errors.tags.message}</p>}

        {/* Backlinks */}
        <Controller
          name="backlinks"
          control={control}
          render={({ field }) => (
            <TagInput label="Backlinks" value={field.value} onChange={field.onChange} placeholder="Related note titles" />
          )}
        />

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">Content *</label>
          <textarea
            {...register("content")}
            rows={10}
            className="input resize-y font-mono text-xs"
            placeholder="Note content in Markdown…"
          />
          {errors.content && <p className="text-xs text-red-500 mt-1">{errors.content.message}</p>}
        </div>

        {/* Photo attachments */}
        <PhotoAttachSection
          noteTitle={watchedTitle}
          photos={attachedPhotos}
          onAdd={(photo) => setAttachedPhotos((prev) => [...prev, photo])}
          onRemove={handleRemovePhoto}
        />

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2 pb-6">
          <button type="submit" disabled={saveNote.isPending} className="btn-primary flex items-center gap-2">
            {saveNote.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {saveNote.isPending ? "Saving…" : "Save Note"}
          </button>
          {saveNote.isSuccess && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Saved!
            </span>
          )}
          {saveNote.isError && (
            <span className="text-sm text-red-500 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> Failed
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
