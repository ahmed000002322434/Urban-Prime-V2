import type { PropsWithChildren } from "react";

import type { DomainName } from "@/lib/migration";

const domainCopy: Record<DomainName, { eyebrow: string; description: string }> = {
  marketing: {
    eyebrow: "Marketing Surface",
    description: "Static and evergreen pages migrate here first with minimal client JavaScript.",
  },
  marketplace: {
    eyebrow: "Marketplace Surface",
    description: "Discovery and detail routes move to cached SSR and ISR while preserving all flows.",
  },
  social: {
    eyebrow: "Social Surface",
    description: "Feed shells stream from the server and hydrate only the visible interactive islands.",
  },
  account: {
    eyebrow: "Account Surface",
    description: "Personalized shells stay server-rendered while realtime interactions remain client-side.",
  },
  admin: {
    eyebrow: "Admin Surface",
    description: "Operational tools are split by route and only hydrate when an operator needs them.",
  },
};

type DomainLayoutProps = PropsWithChildren<{
  domain: DomainName;
}>;

export function DomainLayout({ children, domain }: DomainLayoutProps) {
  const copy = domainCopy[domain];

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),_transparent_28%),linear-gradient(180deg,_#0b1120_0%,_#111827_55%,_#0f172a_100%)] text-slate-50">
      <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-6 py-8 sm:px-10 lg:px-12">
        <header className="mb-8">
          <p className="font-[family:var(--font-poppins)] text-xs font-semibold uppercase tracking-[0.35em] text-amber-300/90">
            {copy.eyebrow}
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            {copy.description}
          </p>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
