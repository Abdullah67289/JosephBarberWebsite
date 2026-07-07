import path from "node:path";

// NOTE: initOpenNextCloudflareForDev() is intentionally NOT called. `next dev`
// then has no Cloudflare context, so src/lib/db.ts falls back to the local
// file SQLite (dev.db) — the fast, zero-setup local workflow. D1 engages only
// on the real Worker (and `npm run preview`), where getCloudflareContext works.

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: path.resolve(process.cwd()),
  // Keep these out of webpack's bundle so OpenNext's esbuild pass (which runs
  // with the "workerd" export condition) resolves them fresh for the Worker:
  //  - @prisma/client: webpack's "node" resolution bakes in the base64-embedded
  //    WASM query compiler (index.js). Left external, esbuild picks the workerd
  //    condition -> edge.js -> a RAW `.wasm` module import, which gzips ~500 KiB
  //    smaller and drops the base64 33% inflation (critical for the 3 MiB
  //    free-plan Worker size limit).
  //  - better-sqlite3 / its adapter: LOCAL-dev only (native .node binary must
  //    never reach the Worker). db.ts loads them via a runtime require.
  serverExternalPackages: [
    "@prisma/client",
    ".prisma/client",
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
  ],
  images: {
    // Cloudflare Workers has no built-in Next image optimizer; serve images
    // as-is (the gallery assets are already web-sized).
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "img1.wsimg.com" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  experimental: {
    // Keep server actions body limit generous for image-data-url uploads in admin.
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
  async headers() {
    // Content-Security-Policy. 'unsafe-inline' is required for scripts because
    // Next injects inline bootstrap/hydration scripts plus the no-flash theme
    // script and JSON-LD (a nonce scheme would force every page dynamic and
    // break the ISR/static pages). Styles are inline via Tailwind/framer-motion.
    // The directives below still add real value: they forbid framing, restrict
    // object/base/form targets, and whitelist connect/img/font origins.
    // 'unsafe-eval' is added in development only — Next's dev HMR / React Fast
    // Refresh use eval(); production bundles never do.
    const scriptSrc =
      process.env.NODE_ENV === "production"
        ? "script-src 'self' 'unsafe-inline'"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
    const csp = [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.stripe.com",
      "frame-src 'self' https://js.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default nextConfig;
