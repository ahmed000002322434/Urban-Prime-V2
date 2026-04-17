import type { Metadata } from "next";
import { Inter, Playfair_Display, Poppins } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { metadataBaseUrl } from "@/lib/migration";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl,
  title: {
    default: "Urban Prime Front Door",
    template: "%s | Urban Prime Front Door",
  },
  description:
    "Incremental Next.js App Router migration shell for Urban Prime with proxy rewrites, route-group layouts, and performance observability.",
  alternates: {
    canonical: "/migration-status",
  },
  openGraph: {
    title: "Urban Prime Front Door",
    description:
      "Incremental migration shell for Urban Prime with hybrid rendering, proxy cutover, and performance gates.",
    url: "/migration-status",
    siteName: "Urban Prime",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Urban Prime Front Door",
    description:
      "Incremental migration shell for Urban Prime with hybrid rendering, proxy cutover, and performance gates.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${inter.variable} ${playfairDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-950 font-[family:var(--font-inter)] text-slate-50">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
