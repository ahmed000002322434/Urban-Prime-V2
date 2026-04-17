export type DomainName = "marketing" | "marketplace" | "social" | "account" | "admin";

type DomainStrategy = {
  domain: DomainName;
  routes: string[];
  rendering: string;
  hydration: string;
};

type PerformanceBudget = {
  metric: string;
  target: string;
  enforcement: string;
};

const normalizeOrigin = (value: string | undefined, fallback: string) => {
  const normalized = String(value || fallback).trim().replace(/\/$/, "");
  return normalized || fallback;
};

const fallbackAppUrl = "https://urban-prime.local";

export const legacyWebOrigin = normalizeOrigin(process.env.LEGACY_WEB_ORIGIN, "http://127.0.0.1:3000");
export const legacyApiOrigin = normalizeOrigin(process.env.LEGACY_API_ORIGIN, "http://127.0.0.1:5050");
export const appUrl = normalizeOrigin(
  process.env.NEXT_PUBLIC_APP_URL || process.env.APP_PUBLIC_URL,
  fallbackAppUrl,
);
export const metadataBaseUrl = new URL(appUrl);

export const migratedSurfaces = ["/migration-status", "/api/health"] as const;

export const domainStrategies: DomainStrategy[] = [
  {
    domain: "marketing",
    routes: ["/about", "/contact", "/press", "/careers", "/support", "/blog"],
    rendering: "Static generation with long ISR and server-rendered metadata",
    hydration: "Minimal client islands only for interactive forms and media controls",
  },
  {
    domain: "marketplace",
    routes: ["/", "/browse", "/stores", "/brands", "/item/:id", "/service/:id"],
    rendering: "ISR for discovery pages and cached SSR for item and storefront detail",
    hydration: "Interactive buy flows, image galleries, and carts stay client-side",
  },
  {
    domain: "social",
    routes: ["/reels", "/spotlight", "/pixe", "/live"],
    rendering: "Server-rendered shell with streamed first viewport payload",
    hydration: "Feed, playback, and creation tools hydrate as isolated client islands",
  },
  {
    domain: "account",
    routes: ["/profile/**", "/messages", "/cart", "/checkout"],
    rendering: "SSR shell with personalized caches and route-level suspense",
    hydration: "Realtime messaging, optimistic cart, and upload surfaces stay client-side",
  },
  {
    domain: "admin",
    routes: ["/admin/**"],
    rendering: "SSR shell with streaming panels and on-demand data invalidation",
    hydration: "Charts, moderation tools, and editors load only when required",
  },
];

export const performanceBudgets: PerformanceBudget[] = [
  {
    metric: "Initial public route JavaScript",
    target: "<= 170 KB gzipped per route shell",
    enforcement: "Bundle analyzer budget gates in CI",
  },
  {
    metric: "Largest Contentful Paint",
    target: "< 2.5s on mid-tier mobile",
    enforcement: "Lighthouse CI and Vercel Speed Insights",
  },
  {
    metric: "Interaction to Next Paint",
    target: "< 200ms",
    enforcement: "Profiler checks plus real-user monitoring",
  },
  {
    metric: "Cumulative Layout Shift",
    target: "< 0.1",
    enforcement: "Geometry-matched loading states and image dimension guarantees",
  },
];

export const completedPhaseOneWins = [
  "Removed the 5 second welcome-screen hard block and made the intro overlay non-blocking.",
  "Stopped eager route warmups that were pulling large route modules into startup.",
  "Deferred AI, comparison, dashboard, floating widgets, and mobile chrome behind lazy boundaries.",
  "Made Firebase analytics and push messaging lazy so they no longer initialize at module load.",
  "Removed the global dotLottie player script and load the player only when a .lottie asset is rendered.",
  "Filtered heavyweight Vite HTML module preloads so deferred vendor chunks stop blocking first load.",
  "Detached auth and notifications from static itemService imports to reduce root-provider startup cost.",
];
