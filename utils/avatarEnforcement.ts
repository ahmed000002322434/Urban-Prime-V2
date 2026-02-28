import { authAvatarIcons, type AuthAvatarGender } from './uiAnimationAssets';

type AvatarIdentityInput = {
  name?: unknown;
  email?: unknown;
  gender?: unknown;
  avatar?: unknown;
};

type AvatarEnforcementOptions = {
  allowCustomAvatar?: boolean;
};

const FEMALE_HINTS = ['female', 'woman', 'girl', 'lady', 'she', 'her', 'mrs', 'ms', 'miss', 'madam'];
const MALE_HINTS = ['male', 'man', 'boy', 'sir', 'he', 'him', 'mr'];

const COMMON_FEMALE_NAMES = new Set([
  'aisha', 'alexis', 'alice', 'alina', 'ana', 'anna', 'anya', 'asma', 'bella', 'chloe', 'diana', 'emma',
  'fatima', 'hannah', 'jessica', 'khadija', 'lily', 'mary', 'maya', 'mia', 'nadia', 'neha', 'nora', 'olivia',
  'priya', 'sara', 'sarah', 'sophia', 'zara', 'zoe'
]);

const COMMON_MALE_NAMES = new Set([
  'adam', 'ahmed', 'alex', 'ali', 'amir', 'brandon', 'daniel', 'david', 'ethan', 'hamza', 'hassan', 'ibrahim',
  'jack', 'james', 'john', 'joseph', 'leo', 'liam', 'michael', 'mohamed', 'muhammad', 'noah', 'omar', 'ryan',
  'sam', 'samir', 'thomas', 'usman', 'william', 'yusuf'
]);

const LEGACY_PLACEHOLDER_AVATARS = new Set(['/icons/urbanprime.svg']);

const toCleanString = (value: unknown) => String(value || '').trim();

const hasAnyHint = (haystack: string, hints: string[]) => {
  if (!haystack) return false;
  return hints.some((hint) => haystack.includes(hint));
};

const tokenized = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean);

export const isSupportedAvatarIcon = (avatar: unknown) =>
  avatar === authAvatarIcons.male || avatar === authAvatarIcons.female;

const hasCustomAvatar = (avatar: unknown) => {
  const value = toCleanString(avatar);
  if (!value) return false;
  if (isSupportedAvatarIcon(value)) return false;
  if (LEGACY_PLACEHOLDER_AVATARS.has(value)) return false;
  return true;
};

export const inferAvatarGender = (input: AvatarIdentityInput): AuthAvatarGender => {
  const genderRaw = toCleanString(input.gender).toLowerCase();
  if (hasAnyHint(genderRaw, FEMALE_HINTS)) return 'female';
  if (hasAnyHint(genderRaw, MALE_HINTS)) return 'male';

  if (input.avatar === authAvatarIcons.female) return 'female';
  if (input.avatar === authAvatarIcons.male) return 'male';

  const name = toCleanString(input.name).toLowerCase();
  const emailLocal = toCleanString(input.email).split('@')[0].toLowerCase();
  const fullText = `${name} ${emailLocal}`.trim();

  if (hasAnyHint(fullText, FEMALE_HINTS)) return 'female';
  if (hasAnyHint(fullText, MALE_HINTS)) return 'male';

  const parts = tokenized(fullText);
  if (parts.some((part) => COMMON_FEMALE_NAMES.has(part))) return 'female';
  if (parts.some((part) => COMMON_MALE_NAMES.has(part))) return 'male';

  return 'male';
};

export const avatarForGender = (gender: AuthAvatarGender) => authAvatarIcons[gender];

export const enforceAvatarIdentity = <T extends AvatarIdentityInput>(
  profile: T,
  options: AvatarEnforcementOptions = {}
) => {
  const gender = inferAvatarGender(profile);
  const allowCustomAvatar = options.allowCustomAvatar !== false;
  const avatar = allowCustomAvatar && hasCustomAvatar(profile.avatar)
    ? toCleanString(profile.avatar)
    : avatarForGender(gender);
  return {
    ...profile,
    gender,
    avatar
  };
};

export const needsAvatarNormalization = (
  profile: AvatarIdentityInput,
  options: AvatarEnforcementOptions = {}
) => {
  const enforced = enforceAvatarIdentity(profile, options);
  const currentAvatar = toCleanString(profile.avatar);
  const currentGender = toCleanString(profile.gender).toLowerCase();
  return currentAvatar !== toCleanString(enforced.avatar) || currentGender !== enforced.gender;
};
