"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { FormState } from "@/lib/form-state";
import type { HomeHeroMedia } from "@/lib/queries";
import { randomUUID } from "node:crypto";

const BUCKET = "product-images";
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
const MAX_IMAGE = 5_000_000; // 5 Mo
const MAX_VIDEO = 50_000_000; // 50 Mo

function toMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : "";
  if (msg === "forbidden" || msg === "unauthorized") return "Action non autorisée.";
  if (msg.startsWith("VISIBLE:")) return msg.slice(8);
  return "Une erreur inattendue est survenue.";
}

/** Upload one media file to Storage (under `home/`) and return its public URL. */
async function uploadMedia(
  file: File,
  kind: "image" | "video",
): Promise<string> {
  const allowed = kind === "video" ? VIDEO_TYPES : IMAGE_TYPES;
  const max = kind === "video" ? MAX_VIDEO : MAX_IMAGE;
  if (file.size > max)
    throw new Error(
      `VISIBLE:Fichier trop volumineux (max ${Math.round(max / 1_000_000)} Mo).`,
    );
  if (!allowed.includes(file.type))
    throw new Error(
      kind === "video"
        ? "VISIBLE:Format vidéo non supporté (MP4, WebM, OGG)."
        : "VISIBLE:Format d'image non supporté (JPEG, PNG, WebP, AVIF, GIF).",
    );
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error(
      "VISIBLE:Stockage non configuré (SUPABASE_SERVICE_ROLE_KEY) — utilisez une URL.",
    );
  const ext =
    (file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg"))
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") || (kind === "video" ? "mp4" : "jpg");
  const path = `home/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });
  if (error) throw new Error("VISIBLE:Téléversement impossible.");
  return admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

const TypeSchema = z.enum(["single", "slideshow", "video"]);

export async function saveHomeHero(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const actor = await requirePermission("settings.write");
    const type = TypeSchema.parse(formData.get("type") || "single");

    // Kept images: one URL per line in the textarea (admin can delete lines).
    const kept = ((formData.get("images") as string) || "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    // Newly uploaded photos are appended.
    const uploads = formData
      .getAll("files")
      .filter((f): f is File => f instanceof File && f.size > 0);
    for (const f of uploads) kept.push(await uploadMedia(f, "image"));

    let value: HomeHeroMedia;

    if (type === "video") {
      const videoFile = formData.get("videoFile");
      let videoUrl = ((formData.get("videoUrl") as string) || "").trim();
      if (videoFile instanceof File && videoFile.size > 0) {
        videoUrl = await uploadMedia(videoFile, "video");
      }
      if (!videoUrl)
        return { error: "Ajoutez une vidéo (fichier ou URL) pour le mode vidéo." };
      const poster = ((formData.get("poster") as string) || "").trim() || undefined;
      value = { type: "video", videoUrl, poster, images: kept };
    } else {
      if (kept.length === 0)
        return { error: "Ajoutez au moins une image (téléversée ou par URL)." };
      // « single » keeps only the first image; « slideshow » keeps them all.
      value = { type, images: type === "single" ? kept.slice(0, 1) : kept };
    }

    const supabase = (await createClient()) as unknown as {
      from: (t: string) => {
        upsert: (
          row: Record<string, unknown>,
          opts?: { onConflict?: string },
        ) => Promise<{ error: { message?: string } | null }>;
      };
    };
    const { error } = await supabase
      .from("shop_settings")
      .upsert(
        { key: "home_hero", value, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) return { error: `Enregistrement impossible : ${error.message ?? "erreur"}.` };

    await logAudit({
      actorId: actor.id,
      action: "settings.update",
      entity: "shop_settings",
      entityId: "home_hero",
      data: { type: value.type, images: value.images.length, video: value.type === "video" },
    });
    revalidatePath("/admin/appearance");
    revalidatePath("/[locale]", "page");
    return { ok: true };
  } catch (e) {
    return { error: toMessage(e) };
  }
}
