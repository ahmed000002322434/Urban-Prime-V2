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

async function probeLegacyApiOrigin() {
  const [rootHealth, apiHealth] = await Promise.all([
    probe(`${legacyApiOrigin}/health`),
    probe(`${legacyApiOrigin}/api/health`),
  ]);

  if (rootHealth.ok || rootHealth.status === 200) {
    return {
      origin: legacyApiOrigin,
      path: "/health",
      ...rootHealth,
    };
  }

  return {
    origin: legacyApiOrigin,
    path: "/api/health",
    ...apiHealth,
  };
}

export async function GET() {
  const [legacyWeb, legacyApi] = await Promise.all([
    probe(legacyWebOrigin),
    probeLegacyApiOrigin(),
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
        legacyApi,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
