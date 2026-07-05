import { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSession, sessionHasAnyPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface R2PutBucket {
  put(key: string, value: ArrayBuffer, opts?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
}

/** R2 bucket binding when running on Cloudflare Workers, else null. */
function getUploadsBucket(): R2PutBucket | null {
  try {
    const bucket = (getCloudflareContext() as unknown as { env?: Record<string, unknown> })?.env?.UPLOADS;
    return bucket ? (bucket as R2PutBucket) : null;
  } catch {
    return null;
  }
}

const MAX_BYTES = 5 * 1024 * 1024;
// SVG is deliberately excluded: uploaded SVGs can carry scripts and are served
// from a public URL (stored-XSS vector).
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function cleanFilename(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function POST(req: NextRequest) {
  // Media uploads serve the gallery/content/shop/staff managers, so any of
  // those grants unlocks it — role rank alone no longer decides admin access.
  const session = await getSession();
  if (!session) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const allowed = await sessionHasAnyPermission(session, [
    "manage_gallery",
    "manage_content",
    "manage_shop",
    "manage_staff",
  ]);
  if (!allowed) return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ ok: false, error: "Choose an image to upload." }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return Response.json({ ok: false, error: "Upload a JPG, PNG, WebP or GIF image." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ ok: false, error: "Images must be 5MB or smaller." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);
  const filename = cleanFilename(file.name || "image");
  const key = `admin/${Date.now()}-${filename}`;
  let url: string;
  let provider = "local";

  const r2 = getUploadsBucket();
  if (r2) {
    await r2.put(key, arrayBuffer, { httpMetadata: { contentType: file.type } });
    provider = "r2";
    url = `/api/uploads/${key}`;
  } else if (env.supabase.isConfigured) {
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
    // Local disk — development fallback only (no writable FS on Workers,
    // where the R2 branch above always applies). Imported dynamically so the
    // Workers bundle never references node:fs at the top level.
    const [{ mkdir, writeFile }, path] = await Promise.all([import("fs/promises"), import("path")]);
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
      alt: String(form.get("alt") || "").slice(0, 300),
      caption: String(form.get("caption") || "").slice(0, 500),
      createdBy: session.email,
    },
  });

  return Response.json({ ok: true, data: { id: asset.id, url: asset.url } });
}
