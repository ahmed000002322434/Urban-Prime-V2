export interface Env {
  ORIGIN_API: string;
  EDGE_BACKEND_KEY?: string;
}

type RequestCfBotManagement = {
  score?: number;
  verifiedBot?: boolean;
};

type RequestCfMetadata = {
  country?: string;
  botManagement?: RequestCfBotManagement;
};

type CachePolicy = {
  browserTtl: number;
  edgeTtl: number;
};

const withTrailingSlashTrimmed = (value: string) => value.replace(/\/$/, '');

const buildOriginUrl = (origin: string, request: Request) => {
  const incomingUrl = new URL(request.url);
  return new URL(`${incomingUrl.pathname}${incomingUrl.search}`, withTrailingSlashTrimmed(origin));
};

const shouldCache = (request: Request, url: URL) => {
  if (request.method !== 'GET') return false;
  if (request.headers.has('authorization')) return false;
  if (request.headers.has('cookie')) return false;
  if (url.pathname.startsWith('/pixe-studio')) return false;
  if (url.pathname === '/pixe/feed' && url.searchParams.get('mode') === 'following') return false;
  return (
    url.pathname === '/pixe/feed'
    || url.pathname.startsWith('/pixe/videos/')
    || url.pathname.startsWith('/pixe/channels/')
  );
};

const getCachePolicy = (url: URL): CachePolicy | null => {
  if (url.pathname === '/pixe/feed') {
    return {
      browserTtl: 0,
      edgeTtl: 15
    };
  }
  if (url.pathname.startsWith('/pixe/videos/')) {
    return {
      browserTtl: 0,
      edgeTtl: 60
    };
  }
  if (url.pathname.startsWith('/pixe/channels/')) {
    return {
      browserTtl: 0,
      edgeTtl: 60
    };
  }
  return null;
};

const applyResponseHeaders = (response: Response, cachePolicy: CachePolicy | null = null) => {
  const next = new Response(response.body, response);
  next.headers.set('x-pixe-edge', 'cloudflare');
  next.headers.set('x-content-type-options', 'nosniff');
  next.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  if (cachePolicy) {
    next.headers.set(
      'cache-control',
      `public, max-age=${cachePolicy.browserTtl}, s-maxage=${cachePolicy.edgeTtl}, stale-while-revalidate=${Math.max(cachePolicy.edgeTtl, 30)}`
    );
  }
  return next;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = withTrailingSlashTrimmed(env.ORIGIN_API || '');
    if (!origin) {
      return new Response('ORIGIN_API is not configured.', { status: 500 });
    }

    const originUrl = buildOriginUrl(origin, request);
    const requestUrl = new URL(request.url);
    const backendHeaders = new Headers(request.headers);
    const requestCf = (request as Request & { cf?: RequestCfMetadata }).cf;
    backendHeaders.set('x-forwarded-host', requestUrl.host);
    backendHeaders.set('x-forwarded-proto', requestUrl.protocol.replace(':', ''));
    const connectingIp = request.headers.get('cf-connecting-ip');
    if (connectingIp) {
      backendHeaders.set('cf-connecting-ip', connectingIp);
    }
    if (request.headers.get('cf-ray')) {
      backendHeaders.set('cf-ray', request.headers.get('cf-ray') || '');
    }
    if (requestCf?.country) {
      backendHeaders.set('x-cf-country', requestCf.country);
    }
    if (typeof requestCf?.botManagement?.score === 'number') {
      backendHeaders.set('x-cf-bot-score', String(requestCf.botManagement.score));
    }
    if (requestCf?.botManagement?.verifiedBot) {
      backendHeaders.set('x-cf-verified-bot', 'true');
    }
    if (env.EDGE_BACKEND_KEY) {
      backendHeaders.set('x-backend-key', env.EDGE_BACKEND_KEY);
    }

    const upstreamRequest = new Request(originUrl.toString(), {
      method: request.method,
      headers: backendHeaders,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'follow'
    });

    const cachePolicy = shouldCache(request, requestUrl) ? getCachePolicy(requestUrl) : null;
    if (cachePolicy) {
      const response = await fetch(upstreamRequest, {
        cf: {
          cacheEverything: true,
          cacheTtlByStatus: {
            '200-299': cachePolicy.edgeTtl,
            404: 5,
            '500-599': 0
          }
        }
      });
      return applyResponseHeaders(response, cachePolicy);
    }

    const response = await fetch(upstreamRequest);
    return applyResponseHeaders(response);
  }
};
