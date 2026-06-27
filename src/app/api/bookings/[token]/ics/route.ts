import { type NextRequest } from "next/server";
import { getBookingByToken } from "@/lib/booking-service";
import { buildIcsForBooking } from "@/lib/notifications";
import { getSettings } from "@/lib/settings";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const booking = await getBookingByToken(token);
  if (!booking) return new Response("Not found", { status: 404 });
  const settings = await getSettings();
  const ics = buildIcsForBooking(booking, settings);

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${booking.reference}.ics"`,
    },
  });
}
