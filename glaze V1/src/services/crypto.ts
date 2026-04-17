import { argon2id } from 'hash-wasm'

import type { ProviderConfig, VaultEnvelope } from '../types/glaze'

function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
}

async function deriveEncryptionKey(passphrase: string, salt: Uint8Array) {
  const hash = await argon2id({
    password: passphrase,
    salt,
    parallelism: 1,
    iterations: 3,
    memorySize: 65536,
    hashLength: 32,
    outputType: 'binary',
  })

  const keyBytes = Uint8Array.from(hash)

  return crypto.subtle.importKey('raw', keyBytes.buffer, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])
}

export async function encryptSecret(
  plaintext: string,
  passphrase: string,
): Promise<VaultEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveEncryptionKey(passphrase, salt)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  )

  return {
    version: 1,
    algorithm: 'AES-GCM',
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    createdAt: new Date().toISOString(),
  }
}

export async function decryptSecret(
  envelope: VaultEnvelope,
  passphrase: string,
) {
  const key = await deriveEncryptionKey(passphrase, base64ToBytes(envelope.salt))
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(envelope.iv) },
    key,
    base64ToBytes(envelope.ciphertext),
  )

  return new TextDecoder().decode(decrypted)
}

export async function unlockProviders(
  providers: ProviderConfig[],
  passphrase: string,
) {
  return Promise.all(
    providers.map(async (provider) => {
      if (!provider.keyEnvelope) {
        return provider
      }

      try {
        const apiKeyPlaintext = await decryptSecret(provider.keyEnvelope, passphrase)
        return { ...provider, apiKeyPlaintext, status: 'connected' as const }
      } catch {
        return { ...provider, apiKeyPlaintext: undefined, status: 'error' as const }
      }
    }),
  )
}
