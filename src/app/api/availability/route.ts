import { type NextRequest } from "next/server";
import { getAvailability } from "@/lib/booking-service";
import { availabilityQuerySchema } from "@/lib/validation";
import { ok, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const parsed = availabilityQuerySchema.parse({
      serviceId: sp.get("serviceId") ?? "",
      staffId: sp.get("staffId") || undefined,
      date: sp.get("date") ?? "",
      addonIds: sp.getAll("addonId"),
    });

    const result = await getAvailability({
      serviceId: parsed.serviceId,
      staffId: parsed.staffId === "any" ? undefined : parsed.staffId,
      date: parsed.date,
      addonIds: parsed.addonIds,
    });

    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
