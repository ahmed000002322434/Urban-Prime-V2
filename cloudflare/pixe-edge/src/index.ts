export interface Env {
  ORIGIN_API: string;
  EDGE_BACKEND_KEY?: string;
  ALLOWED_ORIGINS?: string;
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

type CloudflareCacheRequestInit = RequestInit & {
  cf?: {
    cacheEverything?: boolean;
    cacheTtlByStatus?: Record<string, number>;
  };
};

const EDGE_RUNTIME = 'urban-prime-edge';
const DEFAULT_ALLOWED_ORIGINS = [
  'https://*.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

const withTrailingSlashTrimmed = (value: string) => value.replace(/\/$/, '');

const joinPathSegments = (...segments: string[]) => {
  const parts = segments
    .map((segment) => String(segment || '').trim())
    .filter(Boolean)
    .map((segment, index) => {
      if (index === 0) return segment.replace(/\/+$/, '');
      return segment.replace(/^\/+/, '').replace(/\/+$/, '');
    });

  if (parts.length === 0) return '/';
  const joined = parts.join('/');
  return joined.startsWith('/') ? joined : `/${joined}`;
};

const buildOriginUrl = (origin: string, request: Request) => {
  const incomingUrl = new URL(request.url);
  const originUrl = new URL(withTrailingSlashTrimmed(origin));
  const originPath = originUrl.pathname.replace(/\/$/, '');
  const requestPath = incomingUrl.pathname.startsWith('/') ? incomingUrl.pathname : `/${incomingUrl.pathname}`;

  if (requestPath === '/api' || requestPath.startsWith('/api/')) {
    const normalizedPath = originPath && (requestPath === originPath || requestPath.startsWith(`${originPath}/`))
      ? requestPath
      : joinPathSegments(originPath, requestPath);

    originUrl.pathname = normalizedPath || '/';
    originUrl.search = incomingUrl.search;
    return originUrl;
  }

  originUrl.pathname = joinPathSegments(originPath, '/api/backend');
  originUrl.search = incomingUrl.search;
  originUrl.searchParams.set('route', requestPath.replace(/^\/+/, ''));
  return originUrl;
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

const splitAllowedOrigins = (value?: string) => {
  const source = value?.trim() ? value : DEFAULT_ALLOWED_ORIGINS.join(',');
  return source
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const matchesAllowedOrigin = (origin: string, pattern: string) => {
  if (pattern === '*') return true;
  if (pattern.includes('*')) {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`, 'i').test(origin);
  }
  return origin.toLowerCase() === pattern.toLowerCase();
};

const resolveAllowedOrigin = (request: Request, env: Env) => {
  const requestOrigin = request.headers.get('origin');
  if (!requestOrigin) return null;
  const allowedOrigins = splitAllowedOrigins(env.ALLOWED_ORIGINS);
  return allowedOrigins.some((pattern) => matchesAllowedOrigin(requestOrigin, pattern))
    ? requestOrigin
    : null;
};

const applyCorsHeaders = (response: Response, request: Request, env: Env) => {
  const next = new Response(response.body, response);
  const allowedOrigin = resolveAllowedOrigin(request, env);
  next.headers.append('vary', 'Origin');
  if (allowedOrigin) {
    next.headers.set('access-control-allow-origin', allowedOrigin);
    next.headers.set('access-control-allow-credentials', 'true');
    next.headers.set(
      'access-control-allow-methods',
      'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS'
    );
    next.headers.set(
      'access-control-allow-headers',
      request.headers.get('access-control-request-headers')
        || 'authorization,content-type,x-requested-with'
    );
    next.headers.set('access-control-max-age', '86400');
  } else {
    next.headers.delete('access-control-allow-origin');
    next.headers.delete('access-control-allow-credentials');
    next.headers.delete('access-control-allow-methods');
    next.headers.delete('access-control-allow-headers');
    next.headers.delete('access-control-max-age');
  }
  return next;
};

const applyResponseHeaders = (response: Response, request: Request, env: Env, cachePolicy: CachePolicy | null = null) => {
  const next = new Response(response.body, response);
  next.headers.set('x-urban-prime-edge', 'cloudflare');
  next.headers.set('x-content-type-options', 'nosniff');
  next.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  if (cachePolicy) {
    next.headers.set(
      'cache-control',
      `public, max-age=${cachePolicy.browserTtl}, s-maxage=${cachePolicy.edgeTtl}, stale-while-revalidate=${Math.max(cachePolicy.edgeTtl, 30)}`
    );
  }
  return applyCorsHeaders(next, request, env);
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = withTrailingSlashTrimmed(env.ORIGIN_API || '');
    if (!origin) {
      return new Response('ORIGIN_API is not configured.', { status: 500 });
    }

    const requestUrl = new URL(request.url);
    if (requestUrl.pathname === '/edge-health') {
      const response = Response.json({
        ok: true,
        edge: EDGE_RUNTIME,
        originConfigured: true
      });
      return applyResponseHeaders(response, request, env);
    }

    if (request.method === 'OPTIONS') {
      return applyResponseHeaders(new Response(null, { status: 204 }), request, env);
    }

    const originUrl = buildOriginUrl(origin, request);
    const backendHeaders = new Headers(request.headers);
    const requestCf = (request as Request & { cf?: RequestCfMetadata }).cf;
    backendHeaders.set('x-forwarded-host', requestUrl.host);
    backendHeaders.set('x-forwarded-proto', requestUrl.protocol.replace(':', ''));
    const connectingIp = request.headers.get('cf-connecting-ip');
    if (connectingIp) {
      backendHeaders.set('cf-connecting-ip', connectingIp);
      backendHeaders.set('x-real-ip', connectingIp);
      const forwardedFor = request.headers.get('x-forwarded-for');
      backendHeaders.set('x-forwarded-for', forwardedFor ? `${forwardedFor}, ${connectingIp}` : connectingIp);
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
      } as CloudflareCacheRequestInit);
      return applyResponseHeaders(response, request, env, cachePolicy);
    }

    const response = await fetch(upstreamRequest);
    return applyResponseHeaders(response, request, env);
  }
};
