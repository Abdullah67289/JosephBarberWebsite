/**
 * Permission catalog — the real access-control model. OWNER implicitly holds
 * every permission; workers (any non-owner account) can only reach the areas
 * whose key the owner has granted them (rows in the UserPermission table).
 *
 * Edge-safe: pure data + helpers, no DB or Node imports, so middleware and
 * client components can import it too.
 */

export interface PermissionDef {
  key: string;
  label: string;
  href: string;
  description: string;
}

/** Grantable areas (shown as checkboxes in Manage Team). */
export const PERMISSIONS = [
  { key: "manage_bookings", label: "Bookings", href: "/admin/bookings", description: "View & manage the appointment calendar" },
  { key: "manage_schedule", label: "Schedule", href: "/admin/availability", description: "Business hours, breaks, closures" },
  { key: "manage_staff", label: "Barbers", href: "/admin/staff", description: "Barber profiles & availability" },
  { key: "manage_services", label: "Services", href: "/admin/services", description: "Services, categories & add-ons" },
  { key: "manage_content", label: "Website Content", href: "/admin/content", description: "Home page, FAQ, story & nav" },
  { key: "manage_shop", label: "Shop", href: "/admin/products", description: "Products & inventory" },
  { key: "manage_orders", label: "Orders", href: "/admin/orders", description: "Shop orders & fulfilment" },
  { key: "manage_gallery", label: "Gallery", href: "/admin/gallery", description: "Gallery photos" },
  { key: "manage_reviews", label: "Reviews", href: "/admin/reviews", description: "Customer testimonials" },
  { key: "manage_messages", label: "Messages", href: "/admin/messages", description: "Contact-form inbox" },
] as const satisfies readonly PermissionDef[];

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export const PERMISSION_KEYS: PermissionKey[] = PERMISSIONS.map((p) => p.key);

export function isPermissionKey(value: string): value is PermissionKey {
  return (PERMISSION_KEYS as string[]).includes(value);
}

/** A sensible default grant for a newly-created barber account. */
export const DEFAULT_BARBER_PERMISSIONS: PermissionKey[] = ["manage_bookings", "manage_schedule"];
