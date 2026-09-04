import type { NextConfig } from "next";

let supabaseOrigin = "";
const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
if (configuredSupabaseUrl) {
  try {
    const url = new URL(configuredSupabaseUrl);
    if (["http:", "https:"].includes(url.protocol)) {
      supabaseOrigin = url.origin;
    }
  } catch {
    // Missing/invalid configuration fails data access at runtime; it must not
    // inject arbitrary text into the Content-Security-Policy header.
  }
}
const publicIdentifierPattern = /^[A-Za-z0-9_-]{1,128}$/;
const cloudflareAnalyticsEnabled = publicIdentifierPattern.test(
  process.env.NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN?.trim() ?? "",
);
const supportKoriEnabled = publicIdentifierPattern.test(
  process.env.NEXT_PUBLIC_SUPPORTKORI_ID?.trim() ?? "",
);
const scriptSources = [
  "'self'",
  "'unsafe-inline'",
  ...(process.env.NODE_ENV === "development" ? ["'unsafe-eval'"] : []),
  ...(cloudflareAnalyticsEnabled
    ? ["https://static.cloudflareinsights.com"]
    : []),
  ...(supportKoriEnabled ? ["https://www.supportkori.com"] : []),
].join(" ");
const connectSources = [
  "'self'",
  ...(supabaseOrigin ? [supabaseOrigin] : []),
  ...(cloudflareAnalyticsEnabled
    ? ["https://cloudflareinsights.com"]
    : []),
].join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js streams inline React payloads. A nonce would force dynamic
  // rendering, so this static/CDN-first app keeps unsafe-inline while
  // tightly allowlisting every external script and connection origin.
  `script-src ${scriptSources}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src ${connectSources}`,
  supportKoriEnabled
    ? "frame-src https://supportkori.com https://www.supportkori.com"
    : "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
