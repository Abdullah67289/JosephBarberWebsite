import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);

function cleanFilename(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function POST(req: NextRequest) {
  const session = await requireRole("ADMIN");
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ ok: false, error: "Choose an image to upload." }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return Response.json({ ok: false, error: "Upload a JPG, PNG, WebP, GIF or SVG image." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ ok: false, error: "Images must be 5MB or smaller." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = cleanFilename(file.name || "image");
  const key = `admin/${Date.now()}-${filename}`;
  let url: string;
  let provider = "local";

  if (env.supabase.isConfigured) {
    const base = env.supabase.url.replace(/\/+$/, "");
    const uploadUrl = `${base}/storage/v1/object/${env.supabase.storageBucket}/${key}`;
    const upload = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.supabase.serviceRoleKey}`,
        "Content-Type": file.type,
        "x-upsert": "false",
      },
      body: bytes,
    });
    if (!upload.ok) {
      return Response.json({ ok: false, error: "Supabase upload failed. Check storage bucket permissions." }, { status: 502 });
    }
    provider = "supabase";
    url = `${base}/storage/v1/object/public/${env.supabase.storageBucket}/${key}`;
  } else {
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    const localName = `${Date.now()}-${filename}`;
    await writeFile(path.join(uploadDir, localName), bytes);
    url = `/uploads/${localName}`;
  }

  const asset = await db.mediaAsset.create({
    data: {
      url,
      provider,
      storageKey: key,
      filename,
      mimeType: file.type,
      sizeBytes: file.size,
      alt: String(form.get("alt") || ""),
      caption: String(form.get("caption") || ""),
      createdBy: session.email,
    },
  });

  return Response.json({ ok: true, data: { id: asset.id, url: asset.url } });
}
