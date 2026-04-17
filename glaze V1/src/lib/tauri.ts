export const isTauri = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export const uid = (prefix: string) =>
  `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`
