import { Capacitor, registerPlugin } from '@capacitor/core'

const UPDATE_MANIFEST_URL = 'https://cheng-39.github.io/RECORD_DAILY_DATA/update-manifest.json'

interface NativeAppUpdatePlugin {
  getCurrentVersion(): Promise<{ versionCode: number; versionName: string }>
  downloadAndInstall(options: { url: string; sha256: string; versionName: string }): Promise<{ status: 'installer_opened' | 'permission_required' }>
}

interface UpdateManifest {
  versionCode: number
  versionName: string
  mandatory: boolean
  publishedAt: string
  releaseNotes: string[]
  apkUrl: string
  sha256: string
}

export interface AvailableUpdate extends UpdateManifest {
  currentVersionName: string
}

const AppUpdate = registerPlugin<NativeAppUpdatePlugin>('AppUpdate')

export function supportsNativeAppUpdate(): boolean {
  return Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('AppUpdate')
}

export async function checkForAppUpdate(): Promise<AvailableUpdate | null> {
  if (!supportsNativeAppUpdate()) return null

  const [current, response] = await Promise.all([
    AppUpdate.getCurrentVersion(),
    fetch(UPDATE_MANIFEST_URL, { cache: 'no-store' }),
  ])
  if (!response.ok) throw new Error('Update manifest is unavailable.')

  const data: unknown = await response.json()
  if (!isValidManifest(data) || data.versionCode <= current.versionCode) return null

  return { ...data, currentVersionName: current.versionName }
}

export async function downloadAndInstallUpdate(update: AvailableUpdate): Promise<'installer_opened' | 'permission_required'> {
  const result = await AppUpdate.downloadAndInstall({
    url: update.apkUrl,
    sha256: update.sha256,
    versionName: update.versionName,
  })
  return result.status
}

function isValidManifest(data: unknown): data is UpdateManifest {
  if (!data || typeof data !== 'object') return false
  const manifest = data as Partial<UpdateManifest>
  return Number.isSafeInteger(manifest.versionCode)
    && manifest.versionCode! > 0
    && typeof manifest.versionName === 'string'
    && typeof manifest.mandatory === 'boolean'
    && typeof manifest.publishedAt === 'string'
    && Array.isArray(manifest.releaseNotes)
    && manifest.releaseNotes.every((note) => typeof note === 'string')
    && typeof manifest.apkUrl === 'string'
    && /^https:\/\//.test(manifest.apkUrl)
    && typeof manifest.sha256 === 'string'
    && /^[a-f0-9]{64}$/i.test(manifest.sha256)
}
