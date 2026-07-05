import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  paths: z.array(z.string().regex(/^\/[^\s]*$/)).min(1).max(25),
});

export async function POST(req: Request) {
  // Cache refresh is harmless and is triggered by every manager screen, so any
  // signed-in staff account may call it (permissions gate the actual writes).
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid revalidation request." }, { status: 400 });
  }

  for (const path of parsed.data.paths) {
    revalidatePath(path);
  }

  return NextResponse.json({ ok: true, data: { paths: parsed.data.paths } });
}
