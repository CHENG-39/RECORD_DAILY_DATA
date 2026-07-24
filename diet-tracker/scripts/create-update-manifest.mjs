import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const [apkPath, versionCode, versionName, apkUrl, ...releaseNotes] = process.argv.slice(2)

const versionPattern = /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/
let parsedApkUrl
try {
  parsedApkUrl = new URL(apkUrl)
} catch {
  parsedApkUrl = null
}

if (!apkPath || !/^\d+$/.test(versionCode ?? '') || !versionPattern.test(versionName ?? '') || parsedApkUrl?.protocol !== 'https:') {
  throw new Error('Usage: node scripts/create-update-manifest.mjs <apkPath> <versionCode> <versionName> <httpsApkUrl> [release note...]')
}

const apk = await readFile(resolve(apkPath))
const normalizedReleaseNotes = releaseNotes
  .map(note => note.trim().slice(0, 200))
  .filter(Boolean)
  .slice(0, 12)
const manifest = {
  versionCode: Number(versionCode),
  versionName,
  mandatory: false,
  publishedAt: new Date().toISOString(),
  releaseNotes: normalizedReleaseNotes.length ? normalizedReleaseNotes : ['体验与稳定性优化'],
  apkUrl,
  sha256: createHash('sha256').update(apk).digest('hex'),
}

await writeFile(resolve('public/update-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Generated public/update-manifest.json for ${versionName}`)
