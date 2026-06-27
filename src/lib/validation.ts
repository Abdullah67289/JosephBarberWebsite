import { z } from "zod";

/**
 * Single source of truth for input validation. Every API route, server action
 * and the seed script validate against these — never trust client data.
 */

// ----------------------------------------------------------------- status enums

export const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
  "rescheduled",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const ORDER_STATUSES = ["pending", "paid", "fulfilled", "cancelled", "refunded"] as const;
export const FULFILLMENT_STATUSES = ["unfulfilled", "ready", "completed"] as const;
export const PAYMENT_STATUSES = ["unpaid", "paid", "refunded"] as const;
export const ROLES = ["OWNER", "ADMIN", "BARBER"] as const;
export const CLOSURE_TYPES = ["holiday", "closure", "blackout", "vacation"] as const;

// ----------------------------------------------------------------- primitives

const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format");
const minuteOfDay = z.number().int().min(0).max(1440);
const cents = z.number().int().min(0).max(100_000_00);
const phone = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number")
  .max(32)
  .regex(/^[0-9+().\-\s]+$/, "Enter a valid phone number");
const email = z.string().trim().toLowerCase().email("Enter a valid email").max(160);
const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email")
  .max(160)
  .optional()
  .or(z.literal(""))
  .nullable();
const optionalPhone = phone.optional().or(z.literal("")).nullable();
const nonEmpty = (label: string, max = 200) =>
  z.string().trim().min(1, `${label} is required`).max(max);
const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #c4942b");

// ----------------------------------------------------------------- auth

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(200),
});

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email,
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(200)
    .regex(/[A-Za-z]/, "Include a letter")
    .regex(/[0-9]/, "Include a number"),
});

// ----------------------------------------------------------------- availability + booking

export const availabilityQuerySchema = z.object({
  serviceId: z.string().min(1),
  staffId: z.string().min(1).optional().nullable(),
  date: dateKey,
  addonIds: z.array(z.string().min(1)).optional().default([]),
});

export const bookingCreateSchema = z.object({
  serviceId: z.string().min(1, "Choose a service"),
  staffId: z.string().min(1).optional().nullable(), // null/absent = any barber
  date: dateKey,
  startMinute: z.number().int().min(0).max(1440),
  addonIds: z.array(z.string().min(1)).optional().default([]),
  customer: z.object({
    name: z.string().trim().max(120).optional().default(""),
    email: optionalEmail,
    phone: optionalPhone,
    notes: z.string().trim().max(1000).optional().default(""),
    marketing: z.boolean().optional().default(false),
  }).refine((v) => Boolean(v.email || v.phone), {
    message: "Enter a phone number or email address",
    path: ["phone"],
  }),
});
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;

export const bookingRescheduleSchema = z.object({
  date: dateKey,
  startMinute: z.number().int().min(0).max(1440),
  staffId: z.string().min(1).optional().nullable(),
});

export const bookingCustomerUpdateSchema = z.object({
  name: nonEmpty("Name", 120).optional(),
  email: optionalEmail,
  phone: optionalPhone,
  notes: z.string().trim().max(1000).optional(),
});

export const adminBookingCreateSchema = bookingCreateSchema.extend({
  source: z.enum(["online", "admin", "walk_in"]).default("admin"),
  status: z.enum(BOOKING_STATUSES).default("confirmed"),
  internalNotes: z.string().trim().max(1000).optional().default(""),
});

export const adminBookingUpdateSchema = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  staffId: z.string().min(1).optional().nullable(),
  date: dateKey.optional(),
  startMinute: z.number().int().min(0).max(1440).optional(),
  internalNotes: z.string().trim().max(1000).optional(),
  notes: z.string().trim().max(1000).optional(),
  customer: bookingCustomerUpdateSchema.optional(),
});

// ----------------------------------------------------------------- services

export const serviceSchema = z.object({
  name: nonEmpty("Service name", 120),
  slug: z.string().trim().max(120).optional(),
  description: z.string().trim().max(2000).optional().default(""),
  categoryId: z.string().min(1).optional().nullable(),
  durationMin: z.number().int().min(5).max(600),
  bufferBeforeMin: z.number().int().min(0).max(180).default(0),
  bufferAfterMin: z.number().int().min(0).max(180).default(0),
  priceCents: cents,
  depositCents: cents.default(0),
  imageUrl: z.string().trim().max(1000).optional().nullable(),
  icon: z.string().trim().max(60).optional().nullable(),
  isActive: z.boolean().default(true),
  showOnServicesPage: z.boolean().default(true),
  isBookable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
  staffIds: z.array(z.string().min(1)).default([]),
});

export const serviceCategorySchema = z.object({
  name: nonEmpty("Category name", 80),
  slug: z.string().trim().max(80).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const serviceAddonSchema = z.object({
  serviceId: z.string().min(1),
  name: nonEmpty("Add-on name", 80),
  priceCents: cents.default(0),
  durationMin: z.number().int().min(0).max(180).default(0),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
});

// ----------------------------------------------------------------- staff

export const staffSchema = z.object({
  name: nonEmpty("Name", 120),
  slug: z.string().trim().max(120).optional(),
  title: z.string().trim().max(80).default("Barber"),
  bio: z.string().trim().max(2000).optional().nullable(),
  photoUrl: z.string().trim().max(1000).optional().nullable(),
  email: z.string().trim().toLowerCase().email().max(160).optional().or(z.literal("")).nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
  color: z.string().trim().max(9).default("#c4942b"),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  showOnPublicSite: z.boolean().default(true),
  acceptsBookings: z.boolean().default(true),
  serviceIds: z.array(z.string().min(1)).default([]),
});

// ----------------------------------------------------------------- hours / availability admin

export const businessHourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isOpen: z.boolean(),
  openMinute: minuteOfDay,
  closeMinute: minuteOfDay,
});
export const businessHoursSchema = z.array(businessHourSchema).max(7);

export const staffHourSchema = z.object({
  staffId: z.string().min(1),
  dayOfWeek: z.number().int().min(0).max(6),
  isWorking: z.boolean(),
  startMinute: minuteOfDay,
  endMinute: minuteOfDay,
});
export const staffHoursSchema = z.array(staffHourSchema);

export const breakSchema = z.object({
  staffId: z.string().min(1).optional().nullable(),
  dayOfWeek: z.number().int().min(0).max(6),
  startMinute: minuteOfDay,
  endMinute: minuteOfDay,
  title: z.string().trim().max(60).default("Break"),
});

export const closureSchema = z
  .object({
    title: nonEmpty("Title", 120),
    type: z.enum(CLOSURE_TYPES).default("closure"),
    startDate: dateKey,
    endDate: dateKey,
    staffId: z.string().min(1).optional().nullable(),
    note: z.string().trim().max(500).optional().nullable(),
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "End date must be on or after the start date",
    path: ["endDate"],
  });

export const specialHourSchema = z.object({
  date: dateKey,
  staffId: z.string().min(1).optional().nullable(),
  isClosed: z.boolean().default(false),
  openMinute: minuteOfDay.optional().nullable(),
  closeMinute: minuteOfDay.optional().nullable(),
});

// ----------------------------------------------------------------- products / shop

export const productSchema = z.object({
  name: nonEmpty("Product name", 160),
  slug: z.string().trim().max(160).optional(),
  description: z.string().trim().max(4000).optional().default(""),
  categoryId: z.string().min(1).optional().nullable(),
  priceCents: cents,
  salePriceCents: cents.optional().nullable(),
  sku: z.string().trim().max(64).optional().nullable(),
  stock: z.number().int().min(0).default(0),
  trackInventory: z.boolean().default(true),
  lowStockThreshold: z.number().int().min(0).default(3),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
  images: z
    .array(z.object({ url: z.string().trim().min(1).max(2000), alt: z.string().trim().max(200).optional() }))
    .default([]),
  variants: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        value: z.string().trim().min(1).max(60),
        priceDeltaCents: z.number().int().default(0),
        stock: z.number().int().min(0).default(0),
        sku: z.string().trim().max(64).optional().nullable(),
      }),
    )
    .default([]),
});

export const productCategorySchema = z.object({
  name: nonEmpty("Category name", 80),
  slug: z.string().trim().max(80).optional(),
  description: z.string().trim().max(500).optional().nullable(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional().nullable(),
  quantity: z.number().int().min(1).max(99),
});

export const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1, "Your cart is empty"),
  customer: z.object({
    name: nonEmpty("Name", 120),
    email,
    phone,
  }),
  fulfillmentType: z.enum(["pickup", "shipping"]).default("pickup"),
  shippingAddress: z
    .object({
      line1: z.string().trim().max(200),
      line2: z.string().trim().max(200).optional().default(""),
      city: z.string().trim().max(120),
      region: z.string().trim().max(120),
      postalCode: z.string().trim().max(20),
      country: z.string().trim().max(120).default("Canada"),
    })
    .optional()
    .nullable(),
  notes: z.string().trim().max(1000).optional().default(""),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const orderUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  fulfillmentStatus: z.enum(FULFILLMENT_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  internalNotes: z.string().trim().max(2000).optional(),
});

// ----------------------------------------------------------------- content

export const contactSchema = z.object({
  name: nonEmpty("Name", 120),
  email,
  phone: phone.optional().or(z.literal("")),
  subject: z.string().trim().max(160).optional().default(""),
  message: nonEmpty("Message", 2000),
  // Honeypot — must stay empty (bots fill it).
  website: z.string().max(0).optional().default(""),
});

export const testimonialSchema = z.object({
  author: nonEmpty("Author", 120),
  role: z.string().trim().max(120).optional().nullable(),
  sourceLabel: z.string().trim().max(120).optional().nullable(),
  rating: z.number().int().min(1).max(5).default(5),
  text: nonEmpty("Review", 1000),
  avatarUrl: z.string().trim().max(1000).optional().nullable(),
  isApproved: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
});

export const galleryImageSchema = z.object({
  url: z.string().trim().min(1).max(2000),
  title: z.string().trim().max(160).optional().nullable(),
  caption: z.string().trim().max(200).optional().nullable(),
  category: z.string().trim().max(80).optional().nullable(),
  alt: z.string().trim().max(200).optional().nullable(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
});

// ----------------------------------------------------------------- settings

export const settingsSchema = z.object({
  businessName: nonEmpty("Business name", 120),
  tagline: z.string().trim().max(200).optional().default(""),
  description: z.string().trim().max(2000).optional().default(""),
  logoUrl: z.string().trim().max(1000).optional().nullable(),
  faviconUrl: z.string().trim().max(1000).optional().nullable(),
  heroImageUrl: z.string().trim().max(1000).optional().nullable(),
  heroHeadline: z.string().trim().max(160).optional().default(""),
  heroSubheadline: z.string().trim().max(300).optional().default(""),
  heroPrimaryCtaText: z.string().trim().max(80).optional().default("Book Your Appointment"),
  heroPrimaryCtaHref: z.string().trim().max(300).optional().default("/book"),
  heroSecondaryCtaText: z.string().trim().max(80).optional().default("View Services"),
  heroSecondaryCtaHref: z.string().trim().max(300).optional().default("/services"),
  aboutTitle: z.string().trim().max(160).optional().default(""),
  aboutBody: z.string().trim().max(5000).optional().default(""),
  phone: z.string().trim().max(40),
  email: z.string().trim().toLowerCase().email().max(160),
  address: z.string().trim().max(200),
  city: z.string().trim().max(120),
  region: z.string().trim().max(120),
  postalCode: z.string().trim().max(20),
  country: z.string().trim().max(120),
  mapEmbedUrl: z.string().trim().max(2000).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  timezone: z.string().trim().max(64),
  currency: z.string().trim().length(3),
  instagramUrl: z.string().trim().max(300).optional().nullable(),
  facebookUrl: z.string().trim().max(300).optional().nullable(),
  tiktokUrl: z.string().trim().max(300).optional().nullable(),
  youtubeUrl: z.string().trim().max(300).optional().nullable(),
  googleReviewUrl: z.string().trim().max(300).optional().nullable(),
  navBookText: z.string().trim().max(80).default("Book Now"),
  navBookHref: z.string().trim().max(300).default("/book"),
  showShopInNav: z.boolean().default(true),
  showCartButton: z.boolean().default(true),
  primaryAccentHex: hexColor.default("#c4942b"),
  secondaryAccentHex: hexColor.default("#8b1e1e"),
  seoTitle: z.string().trim().max(160).optional().nullable(),
  seoDescription: z.string().trim().max(300).optional().nullable(),
  openGraphImageUrl: z.string().trim().max(1000).optional().nullable(),
  slotIntervalMin: z.number().int().min(5).max(120),
  minNoticeMin: z.number().int().min(0).max(20160),
  maxAdvanceDays: z.number().int().min(1).max(365),
  maxPerSlot: z.number().int().min(1).max(50),
  cancellationCutoffHours: z.number().int().min(0).max(168),
  depositRequired: z.boolean().default(false),
  allowAnyBarber: z.boolean().default(true),
  requireCustomerName: z.boolean().default(true),
  requireCustomerEmail: z.boolean().default(false),
  requireCustomerPhone: z.boolean().default(false),
  requireCustomerNotes: z.boolean().default(false),
  taxRatePct: z.number().min(0).max(100),
  bookingPolicy: z.string().trim().max(3000).optional().nullable(),
  cancellationPolicy: z.string().trim().max(3000).optional().nullable(),
  latePolicy: z.string().trim().max(3000).optional().nullable(),
  noShowPolicy: z.string().trim().max(3000).optional().nullable(),
  depositPolicy: z.string().trim().max(3000).optional().nullable(),
  privacyPolicy: z.string().trim().max(3000).optional().nullable(),
  bookingInstructions: z.string().trim().max(3000).optional().nullable(),
  bookingHelpText: z.string().trim().max(1000).optional().nullable(),
  bookingNotesHelpText: z.string().trim().max(1000).optional().nullable(),
  bookingConfirmationTitle: z.string().trim().max(120).default("You're booked in!"),
  bookingConfirmationText: z.string().trim().max(500).default("A confirmation is on its way. We can't wait to see you."),
  enableEmail: z.boolean().default(true),
  enableSms: z.boolean().default(true),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

// ----------------------------------------------------------------- website content

export const navigationLinkSchema = z.object({
  area: z.enum(["header", "footer"]).default("header"),
  label: nonEmpty("Label", 80),
  href: z.string().trim().min(1).max(300),
  isActive: z.boolean().default(true),
  openInNewTab: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
});

export const pageContentSchema = z.object({
  pageKey: z.string().trim().min(1).max(60),
  eyebrow: z.string().trim().max(120).optional().nullable(),
  title: nonEmpty("Title", 160),
  subtitle: z.string().trim().max(500).optional().nullable(),
  body: z.string().trim().max(8000).optional().nullable(),
  ctaText: z.string().trim().max(80).optional().nullable(),
  ctaHref: z.string().trim().max(300).optional().nullable(),
  secondaryCtaText: z.string().trim().max(80).optional().nullable(),
  secondaryCtaHref: z.string().trim().max(300).optional().nullable(),
  heroImageUrl: z.string().trim().max(1000).optional().nullable(),
  heroVideoUrl: z.string().trim().max(1000).optional().nullable(),
  seoTitle: z.string().trim().max(160).optional().nullable(),
  seoDescription: z.string().trim().max(300).optional().nullable(),
  ogImageUrl: z.string().trim().max(1000).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const homeSectionSchema = z.object({
  sectionKey: z.string().trim().min(1).max(60),
  label: nonEmpty("Label", 120),
  eyebrow: z.string().trim().max(120).optional().nullable(),
  title: z.string().trim().max(200).optional().nullable(),
  subtitle: z.string().trim().max(600).optional().nullable(),
  ctaText: z.string().trim().max(80).optional().nullable(),
  ctaHref: z.string().trim().max(300).optional().nullable(),
  isVisible: z.boolean().default(true),
  itemLimit: z.number().int().min(0).max(24).default(0),
  displayOrder: z.number().int().default(0),
});

export const siteStatSchema = z.object({
  label: nonEmpty("Label", 120),
  value: z.number().min(0).max(1000000),
  suffix: z.string().trim().max(20).optional().nullable(),
  icon: z.string().trim().max(60).optional().nullable(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
});

export const faqItemSchema = z.object({
  question: nonEmpty("Question", 240),
  answer: nonEmpty("Answer", 3000),
  category: z.string().trim().max(120).optional().nullable(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
});

export const policyItemSchema = z.object({
  key: z.string().trim().min(1).max(80),
  title: nonEmpty("Title", 160),
  body: nonEmpty("Policy", 5000),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
});

export const timelineItemSchema = z.object({
  label: z.string().trim().min(1).max(80),
  title: nonEmpty("Title", 160),
  body: nonEmpty("Story", 3000),
  imageUrl: z.string().trim().max(1000).optional().nullable(),
  isActive: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
});

// ----------------------------------------------------------------- helpers

/** Flatten a ZodError into a `{ field: message }` map for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
