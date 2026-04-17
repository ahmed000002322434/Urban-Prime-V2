import type { PropsWithChildren, ReactNode } from "react";

type StatusCardProps = PropsWithChildren<{
  title: string;
  eyebrow?: string;
  aside?: ReactNode;
}>;

export function StatusCard({ aside, children, eyebrow, title }: StatusCardProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/6 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.28)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">{eyebrow}</p>
          ) : null}
          <h2 className="mt-2 font-[family:var(--font-poppins)] text-2xl font-semibold tracking-tight text-white">
            {title}
          </h2>
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
