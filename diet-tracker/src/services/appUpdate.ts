import { Capacitor, registerPlugin } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'

const UPDATE_MANIFEST_URL = 'https://cheng-39.github.io/RECORD_DAILY_DATA/update-manifest.json'
export const APP_UPDATE_CHECK_EVENT = 'diet-tracker:check-update'

interface NativeAppUpdatePlugin {
  getCurrentVersion(): Promise<{ versionCode: number; versionName: string }>
  getInstallPermissionStatus(): Promise<{ granted: boolean }>
  downloadAndInstall(options: { url: string; sha256: string; versionCode: number; versionName: string }): Promise<{ status: 'installer_opened' | 'permission_required' }>
  addListener(eventName: 'downloadProgress', listener: (progress: UpdateDownloadProgress) => void): Promise<PluginListenerHandle>
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

export interface UpdateDownloadProgress {
  percentage: number
  downloadedBytes: number
  totalBytes: number
}

const AppUpdate = registerPlugin<NativeAppUpdatePlugin>('AppUpdate')

export function supportsNativeAppUpdate(): boolean {
  return Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('AppUpdate')
}

export async function checkForAppUpdate(): Promise<AvailableUpdate | null> {
  if (!supportsNativeAppUpdate()) return null

  const [current, response] = await Promise.all([
    AppUpdate.getCurrentVersion(),
    fetch(`${UPDATE_MANIFEST_URL}?checkedAt=${Date.now()}`, { cache: 'no-store' }),
  ])
  if (!response.ok) throw new Error('Update manifest is unavailable.')

  const data: unknown = await response.json()
  if (!isValidUpdateManifest(data) || data.versionCode <= current.versionCode) return null

  return { ...data, currentVersionName: current.versionName }
}

export async function downloadAndInstallUpdate(update: AvailableUpdate): Promise<'installer_opened' | 'permission_required'> {
  const result = await AppUpdate.downloadAndInstall({
    url: update.apkUrl,
    sha256: update.sha256,
    versionCode: update.versionCode,
    versionName: update.versionName,
  })
  return result.status
}

export async function hasInstallPermission(): Promise<boolean> {
  if (!supportsNativeAppUpdate()) return false
  return (await AppUpdate.getInstallPermissionStatus()).granted
}

export function onUpdateDownloadProgress(listener: (progress: UpdateDownloadProgress) => void): Promise<PluginListenerHandle> {
  return AppUpdate.addListener('downloadProgress', listener)
}

export function getUpdateErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error ? String((error as { code?: unknown }).code ?? '') : ''
  const messages: Record<string, string> = {
    PACKAGE_NAME_MISMATCH: '更新包不是本应用的正式版本，已停止安装',
    SIGNATURE_MISMATCH: '更新包签名与当前版本不一致，已停止安装以保护本地数据',
    VERSION_MISMATCH: '更新包版本信息与服务器清单不一致，请稍后重试',
    VERSION_NOT_NEWER: '下载的版本不高于当前版本，无需安装',
    CHECKSUM_MISMATCH: '更新包完整性校验失败，请稍后重试',
    UPDATE_IN_PROGRESS: '更新正在下载，请稍候',
    INSTALLER_UNAVAILABLE: '系统安装服务不可用，请检查手机安装权限',
    INSTALL_PERMISSION_UNAVAILABLE: '无法打开安装授权页面，请在系统设置中允许本应用安装未知应用',
    DOWNLOAD_TOO_LARGE: '更新包大小异常，已停止下载',
  }
  return messages[code] ?? '更新失败，请检查网络后重试'
}

export function isValidUpdateManifest(data: unknown): data is UpdateManifest {
  if (!data || typeof data !== 'object') return false
  const manifest = data as Partial<UpdateManifest>
  const isHttpsUrl = (value: unknown): value is string => {
    if (typeof value !== 'string') return false
    try {
      const url = new URL(value)
      return url.protocol === 'https:' && Boolean(url.hostname)
    } catch {
      return false
    }
  }
  return Number.isSafeInteger(manifest.versionCode)
    && manifest.versionCode! > 0
    && typeof manifest.versionName === 'string'
    && /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(manifest.versionName)
    && typeof manifest.mandatory === 'boolean'
    && typeof manifest.publishedAt === 'string'
    && Number.isFinite(Date.parse(manifest.publishedAt))
    && Array.isArray(manifest.releaseNotes)
    && manifest.releaseNotes.length > 0
    && manifest.releaseNotes.length <= 12
    && manifest.releaseNotes.every((note) => typeof note === 'string' && note.length > 0 && note.length <= 200)
    && isHttpsUrl(manifest.apkUrl)
    && typeof manifest.sha256 === 'string'
    && /^[a-f0-9]{64}$/i.test(manifest.sha256)
}
