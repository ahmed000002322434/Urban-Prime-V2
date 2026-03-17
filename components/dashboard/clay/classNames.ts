export const cx = (...tokens: Array<string | false | null | undefined>): string =>
  tokens.filter(Boolean).join(' ');
