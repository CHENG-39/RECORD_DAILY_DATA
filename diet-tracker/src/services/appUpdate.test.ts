import { describe, expect, it } from 'vitest'
import { isValidUpdateManifest } from './appUpdate'

const validManifest = {
  versionCode: 6,
  versionName: '1.1.4',
  mandatory: false,
  publishedAt: '2026-07-24T03:24:13.443Z',
  releaseNotes: ['修复更新流程'],
  apkUrl: 'https://example.com/diet-tracker.apk',
  sha256: 'a'.repeat(64),
}

describe('update manifest validation', () => {
  it('accepts a complete HTTPS manifest', () => {
    expect(isValidUpdateManifest(validManifest)).toBe(true)
  })

  it('rejects unsafe URLs, invalid timestamps, and malformed checksums', () => {
    expect(isValidUpdateManifest({ ...validManifest, apkUrl: 'http://example.com/app.apk' })).toBe(false)
    expect(isValidUpdateManifest({ ...validManifest, publishedAt: 'not-a-date' })).toBe(false)
    expect(isValidUpdateManifest({ ...validManifest, sha256: 'not-a-sha256' })).toBe(false)
  })

  it('rejects empty or excessive release notes', () => {
    expect(isValidUpdateManifest({ ...validManifest, releaseNotes: [] })).toBe(false)
    expect(isValidUpdateManifest({ ...validManifest, releaseNotes: Array.from({ length: 13 }, () => 'note') })).toBe(false)
  })
})
