import serverApp from '../server/src/index.js';

const DIRECT_ROUTE_PREFIXES = [
  'admin/',
  'activity/',
  'analytics/',
  'auth/',
  'chat/',
  'commerce/',
  'dashboard/',
  'marketplace/',
  'pixe/',
  'profile/',
  'push/',
  'spotlight/',
  'uploads',
  'webhooks/',
  'work/'
];

const normalizeRouteParam = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join('/');
  }
  return String(value || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/^api(?:\/+|$)/, '');
};

const resolveServerPath = (route: string) => {
  if (!route) return '/';
  if (route === 'health') return '/health';
  if (
    DIRECT_ROUTE_PREFIXES.some((prefix) =>
      prefix.endsWith('/')
        ? route.startsWith(prefix)
        : route === prefix || route.startsWith(`${prefix}/`)
    )
  ) {
    return `/${route}`;
  }
  return `/api/${route}`;
};

export default function handler(req: any, res: any) {
  const route = normalizeRouteParam(req?.query?.route);
  const nextQuery = { ...(req?.query || {}) };
  delete nextQuery.route;
  const url = new URL(String(req?.url || '/'), 'https://backend.local');
  url.searchParams.delete('route');
  const search = url.searchParams.toString();
  const backendKey = String(process.env.BACKEND_API_KEY || '').trim();

  req.query = nextQuery;
  req.headers = { ...(req?.headers || {}) };
  if (backendKey && !req.headers['x-backend-key']) {
    req.headers['x-backend-key'] = backendKey;
  }
  req.url = `${resolveServerPath(route)}${search ? `?${search}` : ''}` || '/';
  return serverApp(req, res);
}
