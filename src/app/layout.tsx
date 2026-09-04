import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Noto_Sans_Bengali, Source_Serif_4 } from "next/font/google";
import Script from "next/script";
import { configuredSiteOrigin } from "@/lib/site-config";
import "./globals.css";

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

const sourceSerif4 = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--font-source-serif-4",
  display: "swap",
});

// Use one self-hosted Bengali family across UI text and headings so the
// language switch keeps a consistent, compact newsroom character.
const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-bengali",
  display: "swap",
});

function optionalPublicIdentifier(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && /^[A-Za-z0-9_-]{1,128}$/.test(value) ? value : null;
}


const SITE_URL = configuredSiteOrigin();
const CLOUDFLARE_ANALYTICS_TOKEN = optionalPublicIdentifier(
  "NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN",
);
const SUPPORTKORI_ID = optionalPublicIdentifier("NEXT_PUBLIC_SUPPORTKORI_ID");
const GOOGLE_SITE_VERIFICATION = optionalPublicIdentifier(
  "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION",
);
const SITE_NAME = "GhushSite";
const SITE_TITLE = "Ghush (ঘুষ) Reports in Bangladesh — GhushSite";
const SITE_DESCRIPTION =
  "Browse anonymous, unverified ghush (ঘুষ/bribe) reports from public offices across Bangladesh on GhushSite, a privacy-first public ledger with no accounts or identity fields.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | GhushSite",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "ghush",
    "ঘুষ",
    "ghushsite",
    "ঘুষসাইট",
    "bribe report Bangladesh",
    "corruption ledger",
    "anonymous bribe report",
    "public office corruption Bangladesh",
    "report a bribe",
    "ঘুষ রিপোর্ট",
  ],
  applicationName: SITE_NAME,
  authors: [{ name: "GhushSite" }],
  category: "Public Interest",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
    alternateLocale: ["bn_BD"],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: GOOGLE_SITE_VERIFICATION
    ? { google: GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export const viewport: Viewport = {
  themeColor: "#f4f3ef",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: ["en", "bn"],
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="bn"
      className={`${ibmPlexMono.variable} ${sourceSerif4.variable} ${notoSansBengali.variable}`}
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        {CLOUDFLARE_ANALYTICS_TOKEN ? (
          <Script
            id="cloudflare-web-analytics"
            type="module"
            strategy="afterInteractive"
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({
              token: CLOUDFLARE_ANALYTICS_TOKEN,
            })}
          />
        ) : null}
        {SUPPORTKORI_ID ? (
          <Script
            id="supportkori-widget"
            strategy="afterInteractive"
            src="https://www.supportkori.com/widget.js"
            data-id={SUPPORTKORI_ID}
            data-message="Support this project"
            data-color="#FFDD00"
            data-position="right"
          />
        ) : null}
      </body>
    </html>
  );
}
