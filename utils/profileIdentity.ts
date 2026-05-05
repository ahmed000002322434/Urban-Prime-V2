const toCleanString = (value: unknown) => String(value || '').trim();

const toTitleCase = (value: string) =>
  value
    .split(' ')
    .map((segment) => {
      const trimmed = segment.trim();
      if (!trimmed) return '';
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    })
    .filter(Boolean)
    .join(' ');

const GENERIC_NAME_PLACEHOLDERS = new Set([
  'user',
  'urban prime member',
  'urban prime user',
  'member'
]);

export const sanitizeUsername = (value: unknown) =>
  toCleanString(value)
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9._-]+/g, '')
    .slice(0, 32);

export const resolvePublicProfileSlug = (user?: {
  username?: unknown;
  id?: unknown;
  name?: unknown;
  email?: unknown;
} | null) => {
  const explicitUsername = sanitizeUsername(user?.username);
  if (explicitUsername) return explicitUsername;

  const normalizedName = sanitizeUsername(String(user?.name || '').split(/\s+/)[0] || '');
  if (normalizedName && normalizedName !== 'user') return normalizedName;

  const emailLocalPart = sanitizeUsername(String(user?.email || '').split('@')[0] || '');
  if (emailLocalPart) return emailLocalPart;

  return toCleanString(user?.id);
};

export const buildPublicProfilePath = (user?: {
  username?: unknown;
  id?: unknown;
  name?: unknown;
  email?: unknown;
} | null) => {
  const slug = resolvePublicProfileSlug(user);
  return slug ? `/user/${encodeURIComponent(slug)}` : '/profile/settings';
};

export const deriveDisplayNameFromEmail = (email: unknown) => {
  const normalizedEmail = toCleanString(email).toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) return '';

  const localPart = normalizedEmail.split('@')[0]?.split('+')[0] || '';
  const normalizedLocalPart = localPart
    .replace(/[^a-z0-9._-]+/gi, ' ')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalizedLocalPart) return '';
  return toTitleCase(normalizedLocalPart);
};

export const deriveUsernameFromIdentity = (options: {
  username?: unknown;
  handle?: unknown;
  email?: unknown;
  name?: unknown;
  id?: unknown;
}) => {
  const explicitUsername = sanitizeUsername(options.username);
  if (explicitUsername) return explicitUsername;

  const explicitHandle = sanitizeUsername(options.handle);
  if (explicitHandle) return explicitHandle;

  const email = toCleanString(options.email).toLowerCase();
  if (email.includes('@')) {
    const localPart = sanitizeUsername(email.split('@')[0]?.split('+')[0] || '');
    if (localPart) return localPart;
  }

  const normalizedName = sanitizeUsername(String(options.name || '').replace(/\s+/g, '.'));
  if (normalizedName && normalizedName !== 'user') return normalizedName;

  const id = toCleanString(options.id);
  if (id) return `user-${id.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 8)}`;

  return 'user';
};

export const resolveDisplayName = (...candidates: unknown[]) => {
  for (const candidate of candidates) {
    const normalized = toCleanString(candidate);
    if (!normalized) continue;
    if (GENERIC_NAME_PLACEHOLDERS.has(normalized.toLowerCase())) continue;
    return normalized;
  }
  return '';
};
