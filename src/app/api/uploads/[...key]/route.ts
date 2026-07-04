import { type NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

interface R2GetBucket {
  get(key: string): Promise<{
    body: ReadableStream;
    httpEtag: string;
    httpMetadata?: { contentType?: string };
  } | null>;
}

/**
 * Serves admin-uploaded media from the R2 bucket on Cloudflare Workers.
 * Keys are created by /api/admin/uploads as `admin/<timestamp>-<filename>`.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  let bucket: R2GetBucket | null = null;
  try {
    const env = (getCloudflareContext() as unknown as { env?: Record<string, unknown> })?.env;
    bucket = (env?.UPLOADS as R2GetBucket | undefined) ?? null;
  } catch {
    // Not on Workers (local dev serves uploads from /public/uploads instead).
  }
  if (!bucket) return new Response("Not found", { status: 404 });

  const { key } = await ctx.params;
  const objectKey = key.join("/");
  // Uploads only ever write under admin/ — refuse anything else.
  if (!objectKey.startsWith("admin/") || objectKey.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const object = await bucket.get(objectKey);
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: object.httpEtag,
    },
  });
}
