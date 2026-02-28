const CHAT_ENCRYPTION_PREFIX = '__enc_v1__:';
const PBKDF2_ITERATIONS = 120_000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const base64ToBytes = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const deriveKey = async (passphrase: string, salt: Uint8Array) => {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

export const isEncryptedChatText = (value: string) => typeof value === 'string' && value.startsWith(CHAT_ENCRYPTION_PREFIX);

export const encryptChatText = async (plainText: string, passphrase: string) => {
  if (!plainText.trim()) return plainText;
  if (!passphrase.trim()) return plainText;

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase.trim(), salt);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plainText)
  );

  const payload = {
    s: bytesToBase64(salt),
    i: bytesToBase64(iv),
    c: bytesToBase64(new Uint8Array(cipherBuffer))
  };
  return `${CHAT_ENCRYPTION_PREFIX}${btoa(JSON.stringify(payload))}`;
};

export const decryptChatText = async (payload: string, passphrase: string) => {
  if (!isEncryptedChatText(payload)) return payload;
  if (!passphrase.trim()) throw new Error('Missing chat passphrase');

  const encoded = payload.slice(CHAT_ENCRYPTION_PREFIX.length);
  const parsed = JSON.parse(atob(encoded));
  const salt = base64ToBytes(String(parsed?.s || ''));
  const iv = base64ToBytes(String(parsed?.i || ''));
  const cipher = base64ToBytes(String(parsed?.c || ''));
  const key = await deriveKey(passphrase.trim(), salt);
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    cipher
  );
  return decoder.decode(plainBuffer);
};

export const getChatEncryptionStorageKey = (threadId: string) => `urbanprime:chat:enc:${threadId}`;

export const CHAT_ENCRYPTION_PREFIX_VALUE = CHAT_ENCRYPTION_PREFIX;

