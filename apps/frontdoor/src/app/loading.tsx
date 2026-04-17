import { LoadingSurface } from "@/components/migration/LoadingSurface";

export default function Loading() {
  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),_transparent_28%),linear-gradient(180deg,_#0b1120_0%,_#111827_55%,_#0f172a_100%)] px-6 py-8 text-slate-50 sm:px-10 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <LoadingSurface />
      </div>
    </div>
  );
}
