import { NextResponse } from "next/server";

import { legacyApiOrigin, legacyWebOrigin, migratedSurfaces } from "@/lib/migration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProbeResult = {
  ok: boolean;
  status: number | null;
  responseTimeMs: number;
  error?: string;
};

async function probe(url: string): Promise<ProbeResult> {
  const startedAt = Date.now();

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
      headers: {
        "user-agent": "urban-prime-frontdoor-healthcheck",
      },
    });

    return {
      ok: response.ok,
      status: response.status,
      responseTimeMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      responseTimeMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Unknown probe failure",
    };
  }
}

export async function GET() {
  const [legacyWeb, legacyApi] = await Promise.all([
    probe(legacyWebOrigin),
    probe(`${legacyApiOrigin}/api/health`),
  ]);

  return NextResponse.json(
    {
      ok: legacyWeb.ok && legacyApi.ok,
      timestamp: new Date().toISOString(),
      migratedSurfaces,
      probes: {
        legacyWeb: {
          origin: legacyWebOrigin,
          ...legacyWeb,
        },
        legacyApi: {
          origin: legacyApiOrigin,
          ...legacyApi,
        },
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
