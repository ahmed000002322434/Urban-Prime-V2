export function LoadingSurface() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <div className="h-52 animate-pulse rounded-[28px] border border-white/10 bg-white/8" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-44 animate-pulse rounded-[28px] border border-white/10 bg-white/8" />
          <div className="h-44 animate-pulse rounded-[28px] border border-white/10 bg-white/8" />
        </div>
      </div>
      <div className="space-y-6">
        <div className="h-60 animate-pulse rounded-[28px] border border-white/10 bg-white/8" />
        <div className="h-60 animate-pulse rounded-[28px] border border-white/10 bg-white/8" />
      </div>
    </div>
  );
}
