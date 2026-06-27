import { type NextRequest } from "next/server";
import { contactSchema } from "@/lib/validation";
import { db } from "@/lib/db";
import { notifyContactMessage } from "@/lib/notifications";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { ok, fail, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req.headers);
    const limit = rateLimit(`contact:${ip}`, 5, 60_000);
    if (!limit.success) return fail("Too many messages. Please try again shortly.", 429);

    const input = contactSchema.parse(await req.json());

    // Honeypot tripped → pretend success, drop silently.
    if (input.website) return ok({ received: true });

    const msg = await db.contactMessage.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone || null,
        subject: input.subject || null,
        message: input.message,
      },
    });

    void notifyContactMessage(msg);
    return ok({ received: true });
  } catch (err) {
    return handleError(err);
  }
}
