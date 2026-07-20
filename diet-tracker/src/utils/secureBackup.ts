export interface EncryptedBackupEnvelope {
  format: 'diet-tracker-encrypted-backup'
  version: 1
  algorithm: 'AES-GCM'
  iterations: number
  salt: string
  iv: string
  ciphertext: string
}

const ITERATIONS = 310000

function getCrypto(): Crypto {
  if (!globalThis.crypto?.subtle) throw new Error('当前浏览器不支持本地加密备份')
  return globalThis.crypto
}

function toBase64(bytes: Uint8Array<ArrayBuffer>): string {
  let binary = ''
  for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index])
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations = ITERATIONS): Promise<CryptoKey> {
  const crypto = getCrypto()
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export function isEncryptedBackup(value: unknown): value is EncryptedBackupEnvelope {
  if (!value || typeof value !== 'object') return false
  const backup = value as Partial<EncryptedBackupEnvelope>
  return backup.format === 'diet-tracker-encrypted-backup'
    && backup.version === 1
    && backup.algorithm === 'AES-GCM'
    && typeof backup.iterations === 'number'
    && typeof backup.salt === 'string'
    && typeof backup.iv === 'string'
    && typeof backup.ciphertext === 'string'
}

export async function encryptBackup(data: unknown, passphrase: string): Promise<EncryptedBackupEnvelope> {
  if (passphrase.length < 8) throw new Error('加密口令至少需要 8 个字符')
  const crypto = getCrypto()
  const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)))
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)))
  const key = await deriveKey(passphrase, salt)
  const plaintext = new TextEncoder().encode(JSON.stringify(data))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  return {
    format: 'diet-tracker-encrypted-backup', version: 1, algorithm: 'AES-GCM', iterations: ITERATIONS,
    salt: toBase64(salt), iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)),
  }
}

export async function decryptBackup(backup: EncryptedBackupEnvelope, passphrase: string): Promise<unknown> {
  try {
    const key = await deriveKey(passphrase, fromBase64(backup.salt), backup.iterations)
    const plaintext = await getCrypto().subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(backup.iv) }, key, fromBase64(backup.ciphertext))
    return JSON.parse(new TextDecoder().decode(plaintext)) as unknown
  } catch {
    throw new Error('无法解密备份，请检查口令和文件是否正确')
  }
}

export function downloadEncryptedBackup(backup: EncryptedBackupEnvelope, date: string): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `diet-records-${date}.encrypted.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
