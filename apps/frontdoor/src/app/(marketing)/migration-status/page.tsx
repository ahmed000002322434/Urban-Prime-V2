import Link from "next/link";

import { StatusCard } from "@/components/migration/StatusCard";
import {
  completedPhaseOneWins,
  domainStrategies,
  legacyApiOrigin,
  legacyWebOrigin,
  migratedSurfaces,
  performanceBudgets,
} from "@/lib/migration";

export const revalidate = 300;

export default function MigrationStatusPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-6">
        <StatusCard
          eyebrow="Front Door"
          title="Hybrid migration shell is live"
          aside={
            <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/12 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-emerald-200">
              Phase 1 active
            </span>
          }
        >
          <p className="max-w-3xl text-sm leading-7 text-slate-200 sm:text-base">
            Next.js now owns the migration shell, health endpoint, metadata, font loading, and fallback routing.
            Unmigrated URLs stay on the legacy application until each domain route group is ported.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Legacy web origin</p>
              <p className="mt-3 break-all text-sm font-medium text-white">{legacyWebOrigin}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Legacy API origin</p>
              <p className="mt-3 break-all text-sm font-medium text-white">{legacyApiOrigin}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-950/30 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Migrated surfaces</p>
              <p className="mt-3 text-sm font-medium text-white">{migratedSurfaces.join(", ")}</p>
            </div>
          </div>
        </StatusCard>

        <StatusCard eyebrow="Completed" title="Phase 1 optimizations already landed">
          <ul className="grid gap-3">
            {completedPhaseOneWins.map((item) => (
              <li
                key={item}
                className="rounded-3xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm leading-7 text-slate-200"
              >
                {item}
              </li>
            ))}
          </ul>
        </StatusCard>

        <StatusCard eyebrow="Route Strategy" title="Domain migration matrix">
          <div className="grid gap-4">
            {domainStrategies.map((strategy) => (
              <article key={strategy.domain} className="rounded-[26px] border border-white/10 bg-slate-950/30 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h3 className="font-[family:var(--font-poppins)] text-lg font-semibold capitalize text-white">
                      {strategy.domain}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-slate-300">{strategy.rendering}</p>
                  </div>
                  <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/8 px-3 py-2 text-xs uppercase tracking-[0.24em] text-cyan-100">
                    {strategy.hydration}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {strategy.routes.map((route) => (
                    <span
                      key={route}
                      className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-medium tracking-[0.2em] text-slate-200"
                    >
                      {route}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </StatusCard>
      </div>

      <div className="space-y-6">
        <StatusCard eyebrow="Budgets" title="Performance gates for cutover">
          <div className="grid gap-4">
            {performanceBudgets.map((budget) => (
              <article key={budget.metric} className="rounded-[26px] border border-white/10 bg-slate-950/30 p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{budget.metric}</p>
                <p className="mt-3 font-[family:var(--font-poppins)] text-xl font-semibold text-white">
                  {budget.target}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-300">{budget.enforcement}</p>
              </article>
            ))}
          </div>
        </StatusCard>

        <StatusCard eyebrow="Operations" title="Runtime checks and next actions">
          <div className="space-y-4 text-sm leading-7 text-slate-200">
            <p>
              Use the health route to confirm that the front door can see both legacy origins before migrating any
              public route group.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/api/health"
                className="inline-flex items-center justify-center rounded-full border border-amber-300/30 bg-amber-300/12 px-4 py-2 font-medium text-amber-100 transition hover:border-amber-200/50 hover:bg-amber-200/16"
              >
                Open health payload
              </Link>
              <Link
                href={legacyWebOrigin}
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/8 px-4 py-2 font-medium text-white transition hover:border-white/30 hover:bg-white/12"
              >
                Open legacy app
              </Link>
            </div>
            <ol className="grid gap-3">
              <li className="rounded-3xl border border-white/10 bg-slate-950/30 px-4 py-3">
                Migrate marketing and marketplace discovery routes into the new App Router first.
              </li>
              <li className="rounded-3xl border border-white/10 bg-slate-950/30 px-4 py-3">
                Move Express endpoints route-by-route into <code className="text-cyan-100">app/api</code> and server-only modules.
              </li>
              <li className="rounded-3xl border border-white/10 bg-slate-950/30 px-4 py-3">
                Enforce bundle budgets, visual regression checks, and CWV thresholds before each cutover step.
              </li>
            </ol>
          </div>
        </StatusCard>
      </div>
    </div>
  );
}
