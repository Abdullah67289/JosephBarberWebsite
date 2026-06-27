import { cache } from "react";
import { db } from "./db";
import { env } from "./env";
import type { SiteSettings } from "@prisma/client";

const SETTINGS_ID = "singleton";

/**
 * Load the singleton SiteSettings row, creating it with sensible defaults on
 * first run. Wrapped in React's request cache so a single request only hits the
 * DB once.
 */
export const getSettings = cache(async function getSettings(): Promise<SiteSettings> {
  const existing = await db.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (existing) return existing;

  return db.siteSettings.create({
    data: { id: SETTINGS_ID, timezone: env.shopTimezone },
  });
});

export function shopAddressLines(s: SiteSettings): string[] {
  return [s.address, `${s.city}, ${s.region} ${s.postalCode}`, s.country].filter(Boolean);
}

export function fullAddress(s: SiteSettings): string {
  return `${s.address}, ${s.city}, ${s.region} ${s.postalCode}, ${s.country}`;
}
