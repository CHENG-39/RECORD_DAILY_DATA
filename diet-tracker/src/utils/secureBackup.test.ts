import { describe, expect, it } from 'vitest'
import { decryptBackup, encryptBackup, isEncryptedBackup } from './secureBackup'

describe('secure backup', () => {
  it('round-trips data with the correct passphrase', async () => {
    const source = { records: [{ id: 'record-1', calories: 120 }], exportDate: '2026-07-20' }
    const encrypted = await encryptBackup(source, 'correct horse battery staple')

    expect(isEncryptedBackup(encrypted)).toBe(true)
    await expect(decryptBackup(encrypted, 'correct horse battery staple')).resolves.toEqual(source)
  })

  it('rejects a short passphrase and a wrong restore passphrase', async () => {
    await expect(encryptBackup({ records: [] }, 'short')).rejects.toThrow('至少需要 8 个字符')
    const encrypted = await encryptBackup({ records: [] }, 'long-enough-passphrase')
    await expect(decryptBackup(encrypted, 'wrong-passphrase')).rejects.toThrow('无法解密备份')
  })
})
