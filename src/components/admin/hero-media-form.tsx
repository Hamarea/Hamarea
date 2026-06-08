"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Film, Images as ImagesIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/form-state";
import type { HomeHeroMedia } from "@/lib/queries";

type Mode = "single" | "slideshow" | "video";

const MODES: { value: Mode; label: string; hint: string; icon: typeof ImageIcon }[] = [
  { value: "single", label: "Une photo", hint: "Une seule image de fond.", icon: ImageIcon },
  { value: "slideshow", label: "Plusieurs photos", hint: "Diaporama qui défile.", icon: ImagesIcon },
  { value: "video", label: "Vidéo", hint: "Vidéo en boucle, sans son.", icon: Film },
];

export function HeroMediaForm({
  action,
  initial,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial: HomeHeroMedia;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const [mode, setMode] = useState<Mode>(initial.type);
  const ref = useRef<HTMLFormElement>(null);

  // After a successful save, clear the file inputs (URLs persist in the textarea).
  useEffect(() => {
    if (state.ok) {
      ref.current?.querySelectorAll<HTMLInputElement>('input[type="file"]').forEach((i) => (i.value = ""));
    }
  }, [state.ok]);

  const initialImages = initial.images.filter((u) => u && u !== "/hero.jpg");

  return (
    <form ref={ref} action={formAction} className="space-y-6">
      {/* Mode selector */}
      <fieldset className="grid gap-3 sm:grid-cols-3">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = mode === m.value;
          return (
            <label
              key={m.value}
              className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-4 transition-colors ${
                active
                  ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)] ring-1 ring-[var(--color-primary-500)]"
                  : "border-[var(--color-border)] hover:bg-[var(--color-bg)]"
              }`}
            >
              <span className="flex items-center gap-2 font-medium">
                <input
                  type="radio"
                  name="type"
                  value={m.value}
                  checked={active}
                  onChange={() => setMode(m.value)}
                  className="sr-only"
                />
                <Icon className="h-4 w-4" />
                {m.label}
              </span>
              <span className="text-xs text-[var(--color-muted)]">{m.hint}</span>
            </label>
          );
        })}
      </fieldset>

      {/* Current media preview */}
      {(initialImages.length > 0 || initial.videoUrl) && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
            Actuellement en ligne
          </p>
          <div className="flex flex-wrap gap-2">
            {initial.type === "video" && initial.videoUrl ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={initial.videoUrl} className="h-24 rounded-lg ring-1 ring-[var(--color-border)]" muted />
            ) : (
              initialImages.map((u) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={u} src={u} alt="" className="h-24 w-24 rounded-lg object-cover ring-1 ring-[var(--color-border)]" />
              ))
            )}
          </div>
        </div>
      )}

      {/* Photo fields (single / slideshow) */}
      {mode !== "video" && (
        <div className="space-y-4 rounded-xl border border-[var(--color-border)] p-4">
          <div className="space-y-1.5">
            <Label htmlFor="files">
              {mode === "single" ? "Photo (depuis l'ordinateur)" : "Photos (plusieurs possibles)"}
            </Label>
            <input
              id="files"
              type="file"
              name="files"
              accept="image/*"
              multiple={mode === "slideshow"}
              className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-primary-600)] file:px-3 file:py-1.5 file:text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="images">… ou photos par URL (une par ligne)</Label>
            <textarea
              id="images"
              name="images"
              rows={mode === "slideshow" ? 4 : 2}
              defaultValue={initialImages.join("\n")}
              placeholder="https://…"
              className="w-full resize-y rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
            />
            <p className="text-xs text-[var(--color-muted)]">
              {mode === "single"
                ? "La première image est utilisée comme fond."
                : "Les images défilent dans l'ordre, toutes les 5 secondes."}
            </p>
          </div>
        </div>
      )}

      {/* Video fields */}
      {mode === "video" && (
        <div className="space-y-4 rounded-xl border border-[var(--color-border)] p-4">
          {/* Keep image URLs available as a poster/fallback even in video mode. */}
          <input type="hidden" name="images" value={initialImages.join("\n")} />
          <div className="space-y-1.5">
            <Label htmlFor="videoFile">Vidéo (depuis l&apos;ordinateur, max 50 Mo)</Label>
            <input
              id="videoFile"
              type="file"
              name="videoFile"
              accept="video/mp4,video/webm,video/ogg"
              className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-primary-600)] file:px-3 file:py-1.5 file:text-white"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="videoUrl">… ou vidéo par URL</Label>
            <Input
              id="videoUrl"
              name="videoUrl"
              type="url"
              maxLength={1000}
              defaultValue={initial.type === "video" ? initial.videoUrl ?? "" : ""}
              placeholder="https://….mp4"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="poster">Image d&apos;attente (poster, URL — optionnel)</Label>
            <Input
              id="poster"
              name="poster"
              type="url"
              maxLength={1000}
              defaultValue={initial.poster ?? ""}
              placeholder="https://…"
            />
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            La vidéo est lue en boucle, sans son (comme un fond animé).
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton>Enregistrer le fond</SubmitButton>
        {state.error && <span className="text-sm text-[var(--color-danger)]">{state.error}</span>}
        {state.ok && (
          <span className="text-sm text-[var(--color-secondary-700)]">Fond mis à jour. 🌊</span>
        )}
      </div>
    </form>
  );
}
