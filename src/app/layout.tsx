import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/components/theme-provider";
import { ChunkErrorReloader } from "@/components/chunk-error-reloader";
import { getSettings, fullAddress } from "@/lib/settings";
import { env } from "@/lib/env";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800", "900"],
  display: "swap",
});

// The root layout queries the database (getSettings) for every single page,
// including auto-generated routes like /_not-found. D1 only exists inside a
// live Worker request, never during the Cloudflare build step, so nothing in
// this app can be prerendered at build time — force dynamic rendering here,
// at the root, so it's guaranteed to apply everywhere.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const title = s.seoTitle || `${s.businessName} - ${s.tagline}`;
  const description = s.seoDescription || s.description;
  const image = s.openGraphImageUrl || s.heroImageUrl;

  return {
    metadataBase: new URL(env.siteUrl),
    title: {
      default: title,
      template: `%s - ${s.businessName}`,
    },
    description,
    keywords: ["barbershop", "Milton", "haircut", "fade", "beard trim", "hot towel shave", s.businessName],
    openGraph: {
      type: "website",
      title,
      description,
      siteName: s.businessName,
      url: env.siteUrl,
      images: image ? [{ url: image, width: 1200, height: 630 }] : [],
    },
    twitter: { card: "summary_large_image", title, description },
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg", apple: "/favicon.svg" },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#0d0c0b",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const themeStyle = {
    "--primary": hexToHslVar(s.primaryAccentHex),
    "--ring": hexToHslVar(s.primaryAccentHex),
    "--accent": hexToHslVar(s.secondaryAccentHex),
  } as React.CSSProperties;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: s.businessName,
    description: s.description,
    image: s.heroImageUrl ?? undefined,
    telephone: s.phone,
    email: s.email,
    url: env.siteUrl,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: s.address,
      addressLocality: s.city,
      addressRegion: s.region,
      postalCode: s.postalCode,
      addressCountry: s.country,
    },
    geo:
      s.latitude && s.longitude
        ? { "@type": "GeoCoordinates", latitude: s.latitude, longitude: s.longitude }
        : undefined,
    sameAs: [s.instagramUrl, s.facebookUrl, s.tiktokUrl, s.youtubeUrl].filter(Boolean),
  };

  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <body className="min-h-screen font-sans" style={themeStyle}>
        {/* Applies the saved light/dark theme before first paint (no flash). */}
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ChunkErrorReloader />
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            classNames: {
              toast: "!bg-card !border-border !text-foreground",
            },
          }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          // "<" is escaped so admin-entered settings text can never close the
          // script tag and inject markup (stored XSS via JSON-LD).
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
        <span className="sr-only" aria-hidden>
          {fullAddress(s)}
        </span>
      </body>
    </html>
  );
}

function hexToHslVar(hex: string): string {
  const safe = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#c4942b";
  const r = parseInt(safe.slice(1, 3), 16) / 255;
  const g = parseInt(safe.slice(3, 5), 16) / 255;
  const b = parseInt(safe.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let saturation = 0;
  const lightness = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    saturation = lightness > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}
