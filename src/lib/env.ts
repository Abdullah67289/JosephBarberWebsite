/**
 * Centralised, typed access to environment variables.
 * Integration providers are optional — `isConfigured` flags let the app
 * degrade gracefully (log instead of send) when keys are absent.
 */

function get(name: string, fallback = ""): string {
  return process.env[name]?.trim() || fallback;
}

export const env = {
  databaseUrl: get("DATABASE_URL", "file:./dev.db"),
  siteUrl: get("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),
  shopTimezone: get("SHOP_TIMEZONE", "America/Toronto"),

  authSecret: get("AUTH_SECRET", "dev-only-insecure-secret-change-me"),
  adminAllowedEmails: get("ADMIN_ALLOWED_EMAILS"),
  allowDevAdminBypass: get("ALLOW_DEV_ADMIN_BYPASS", "false").toLowerCase() === "true",
  allowAdminSignup: get("ALLOW_ADMIN_SIGNUP", "false").toLowerCase() === "true",

  seedAdminEmail: get("SEED_ADMIN_EMAIL", "owner@josephandmikes.com"),
  seedAdminPassword: get("SEED_ADMIN_PASSWORD", "ChangeMe!2024"),

  email: {
    apiKey: get("RESEND_API_KEY"),
    from: get("EMAIL_FROM", "Joseph & Mike's Barbershop <bookings@josephandmikes.com>"),
    adminTo: get("ADMIN_NOTIFICATION_EMAIL", "owner@josephandmikes.com"),
    get isConfigured() {
      return Boolean(get("RESEND_API_KEY"));
    },
  },

  sms: {
    accountSid: get("TWILIO_ACCOUNT_SID"),
    authToken: get("TWILIO_AUTH_TOKEN"),
    from: get("TWILIO_PHONE_NUMBER"),
    get isConfigured() {
      return Boolean(
        get("TWILIO_ACCOUNT_SID") &&
          get("TWILIO_AUTH_TOKEN") &&
          get("TWILIO_PHONE_NUMBER"),
      );
    },
  },

  stripe: {
    secretKey: get("STRIPE_SECRET_KEY"),
    publishableKey: get("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
    webhookSecret: get("STRIPE_WEBHOOK_SECRET"),
    get isConfigured() {
      return Boolean(get("STRIPE_SECRET_KEY"));
    },
  },

  supabase: {
    url: get("SUPABASE_URL"),
    serviceRoleKey: get("SUPABASE_SERVICE_ROLE_KEY"),
    storageBucket: get("SUPABASE_STORAGE_BUCKET", "barbershop-media"),
    get isConfigured() {
      return Boolean(get("SUPABASE_URL") && get("SUPABASE_SERVICE_ROLE_KEY"));
    },
  },

  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};

export function isLocalSiteUrl(url = env.siteUrl): boolean {
  return (
    url.startsWith("http://localhost") ||
    url.startsWith("http://127.0.0.1") ||
    url.startsWith("http://[::1]")
  );
}

export function isDevAdminBypassAllowed(): boolean {
  return env.allowDevAdminBypass && (!env.isProduction || isLocalSiteUrl());
}

/**
 * Self-service admin signup is only open when explicitly enabled via
 * ALLOW_ADMIN_SIGNUP. This is a setup/onboarding switch — keep it off in
 * normal production so random visitors can never create admin accounts.
 */
export function isAdminSignupAllowed(): boolean {
  return env.allowAdminSignup;
}

export function adminEmailAllowed(email: string): boolean {
  const raw = env.adminAllowedEmails;
  if (!raw.trim()) return true;
  const allowed = raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

/** Throw at boot in production if critical secrets are still defaults. */
export function assertProductionSecrets() {
  if (!env.isProduction) return;
  if (isLocalSiteUrl()) return;
  if (env.authSecret.startsWith("dev-only")) {
    throw new Error("AUTH_SECRET must be set to a strong value in production.");
  }
}
