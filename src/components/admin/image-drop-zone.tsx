"use client";

import { useRef, useState } from "react";
import { UploadCloud, X } from "lucide-react";

/**
 * Drag-and-drop photo field. Wraps a hidden file input (keeps its `name`, so the
 * parent server-action form submits it). Supports click-to-pick, drop, preview
 * and clear. No upload happens here — the surrounding form does that on submit.
 */
export function ImageDropZone({ name = "file" }: { name?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const setFile = (file: File | null) => {
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    });
    setFileName(file ? file.name : null);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && inputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      inputRef.current.files = dt.files;
      setFile(file);
    }
  };

  const clear = () => {
    if (inputRef.current) inputRef.current.value = "";
    setFile(null);
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={
          "flex cursor-pointer items-center gap-3 rounded-md border border-dashed px-3 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-400)] " +
          (dragOver
            ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)]"
            : "border-[var(--color-border)] hover:bg-[var(--color-bg)]")
        }
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
        ) : (
          <UploadCloud className="h-5 w-5 shrink-0 text-[var(--color-muted)]" />
        )}
        <span className="min-w-0 flex-1 truncate text-[var(--color-muted)]">
          {fileName ?? "Glissez une photo ici, ou cliquez pour choisir"}
        </span>
        {fileName && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clear();
            }}
            aria-label="Retirer la photo"
            className="shrink-0 rounded p-1 text-[var(--color-muted)] hover:bg-[var(--color-border)]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*"
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
