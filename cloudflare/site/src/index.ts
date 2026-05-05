interface Env {
  ASSETS: Fetcher;
  ORIGIN_APP: string;
}

const API_PREFIXES = [
  '/api/',
  '/auth/',
  '/uploads',
  '/webhooks/',
  '/admin/',
  '/analytics/',
  '/activity/',
  '/push/',
  '/commerce/',
  '/work/',
  '/marketplace/',
  '/profile/me',
  '/chat/calls',
  '/chat/presence',
  '/spotlight/feed',
  '/spotlight/content',
  '/spotlight/context',
  '/spotlight/share',
  '/spotlight/profile/availability',
  '/spotlight/product-',
  '/spotlight/events/',
  '/spotlight/comments/',
  '/spotlight/follow/',
  '/spotlight/block',
  '/spotlight/restrict',
  '/spotlight/report',
  '/spotlight/analytics/',
  '/spotlight/suggested-users',
  '/pixe/feed',
  '/pixe/uploads',
  '/pixe/videos',
  '/pixe/comments',
  '/pixe/channels',
  '/pixe/profile',
  '/pixe/studio',
  '/pixe/events/'
];
const HEALTH_PATH = '/health';
const CANONICAL_HOST = 'urbanprime.tech';
const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;

const normalizeOrigin = (value: string) => String(value || '').trim().replace(/\/+$/, '');

const canonicalRedirectUrl = (requestUrl: URL) => {
  if (requestUrl.protocol === 'https:' && requestUrl.hostname.toLowerCase() === CANONICAL_HOST) {
    return null;
  }

  const target = new URL(requestUrl.toString());
  target.protocol = 'https:';
  target.hostname = CANONICAL_HOST;
  target.port = '';
  return target.toString();
};

const shouldProxyRequest = (pathname: string) => (
  pathname === HEALTH_PATH || API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))
);

const shouldUseVercelBackendAdapter = (pathname: string) => {
  if (pathname === HEALTH_PATH) return false;
  if (pathname === '/api' || pathname.startsWith('/api/')) return false;
  if (pathname === '/webhooks' || pathname.startsWith('/webhooks/')) return false;
  return shouldProxyRequest(pathname);
};

const buildOriginUrl = (originApp: string, requestUrl: URL) => {
  const target = new URL(requestUrl.toString());
  const normalizedOrigin = normalizeOrigin(originApp);
  const upstream = new URL(normalizedOrigin);
  target.protocol = upstream.protocol;
  target.hostname = upstream.hostname;
  target.port = upstream.port;

  if (shouldUseVercelBackendAdapter(requestUrl.pathname)) {
    const route = requestUrl.pathname.replace(/^\/+/, '');
    target.pathname = '/api/backend';
    target.searchParams.set('route', route);
  }

  return target;
};

const proxyToOrigin = async (request: Request, env: Env) => {
  const requestUrl = new URL(request.url);
  const targetUrl = buildOriginUrl(env.ORIGIN_APP, requestUrl);
  const headers = new Headers(request.headers);
  headers.set('x-forwarded-host', requestUrl.host);
  headers.set('x-forwarded-proto', requestUrl.protocol.replace(':', ''));

  return fetch(new Request(targetUrl.toString(), {
    method: request.method,
    headers,
    body: request.body,
    redirect: 'manual'
  }));
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestUrl = new URL(request.url);
    const redirectUrl = canonicalRedirectUrl(requestUrl);
    if (redirectUrl) {
      return Response.redirect(redirectUrl, 308);
    }

    if (shouldProxyRequest(requestUrl.pathname)) {
      return proxyToOrigin(request, env);
    }

    const response = await env.ASSETS.fetch(request);
    if (!response.headers.get('content-type')?.includes('text/html')) {
      return response;
    }

    const headers = new Headers(response.headers);
    headers.set('Link', `<${CANONICAL_ORIGIN}${requestUrl.pathname}>; rel="canonical"`);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
