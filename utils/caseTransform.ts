const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const camelToSnakeKey = (key: string) =>
  key.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/-/g, '_').toLowerCase();

const snakeToCamelKey = (key: string) =>
  key.replace(/[_-]([a-z0-9])/gi, (_, char: string) => char.toUpperCase());

const transformKeysDeep = (value: unknown, transformKey: (key: string) => string): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => transformKeysDeep(entry, transformKey));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, entry]) => {
    acc[transformKey(key)] = transformKeysDeep(entry, transformKey);
    return acc;
  }, {});
};

export const toSnakeCaseDeep = <T,>(value: T): T =>
  transformKeysDeep(value, camelToSnakeKey) as T;

export const toCamelCaseDeep = <T,>(value: T): T =>
  transformKeysDeep(value, snakeToCamelKey) as T;

