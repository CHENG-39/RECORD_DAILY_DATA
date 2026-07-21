import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const [apkPath, versionCode, versionName, apkUrl, ...releaseNotes] = process.argv.slice(2)

if (!apkPath || !/^\d+$/.test(versionCode ?? '') || !versionName || !/^https:\/\//.test(apkUrl ?? '')) {
  throw new Error('Usage: node scripts/create-update-manifest.mjs <apkPath> <versionCode> <versionName> <httpsApkUrl> [release note...]')
}

const apk = await readFile(resolve(apkPath))
const manifest = {
  versionCode: Number(versionCode),
  versionName,
  mandatory: false,
  publishedAt: new Date().toISOString(),
  releaseNotes: releaseNotes.length ? releaseNotes : ['体验与稳定性优化'],
  apkUrl,
  sha256: createHash('sha256').update(apk).digest('hex'),
}

await writeFile(resolve('public/update-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Generated public/update-manifest.json for ${versionName}`)
