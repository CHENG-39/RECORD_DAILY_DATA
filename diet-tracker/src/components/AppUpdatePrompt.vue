<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { closeToast, showFailToast, showLoadingToast, showToast } from 'vant'
import {
  APP_UPDATE_CHECK_EVENT,
  checkForAppUpdate,
  downloadAndInstallUpdate,
  getUpdateErrorMessage,
  hasInstallPermission,
  onUpdateDownloadProgress,
  supportsNativeAppUpdate,
  type AvailableUpdate,
} from '@/services/appUpdate'
import type { PluginListenerHandle } from '@capacitor/core'

const update = ref<AvailableUpdate | null>(null)
const visible = ref(false)
const downloading = ref(false)
const checking = ref(false)
const downloadProgress = ref(0)
const waitingForPermission = ref(false)
let progressListener: PluginListenerHandle | null = null
let automaticCheckTimer: number | undefined
let disposed = false

onMounted(() => {
  window.addEventListener(APP_UPDATE_CHECK_EVENT, handleManualUpdateCheck)
  window.addEventListener('focus', resumeAfterPermission)
  if (!supportsNativeAppUpdate()) return
  void onUpdateDownloadProgress((progress) => {
    downloadProgress.value = Math.max(0, Math.min(100, Math.round(progress.percentage)))
  }).then((listener) => {
    if (disposed) void listener.remove()
    else progressListener = listener
  })
  automaticCheckTimer = window.setTimeout(() => void checkForUpdate(false), 1800)
})

onBeforeUnmount(() => {
  disposed = true
  if (automaticCheckTimer !== undefined) window.clearTimeout(automaticCheckTimer)
  window.removeEventListener(APP_UPDATE_CHECK_EVENT, handleManualUpdateCheck)
  window.removeEventListener('focus', resumeAfterPermission)
  void progressListener?.remove()
})

async function checkForUpdate(manual: boolean): Promise<void> {
  if (checking.value) return
  if (!supportsNativeAppUpdate()) {
    if (manual) showToast('应用内更新仅适用于 Android 安装版')
    return
  }
  checking.value = true
  if (manual) showLoadingToast({ message: '正在检查更新', forbidClick: true, duration: 0 })
  try {
    update.value = await checkForAppUpdate()
    visible.value = Boolean(update.value)
    if (manual) {
      closeToast()
      if (!update.value) showToast('当前已是最新版本')
    }
  } catch {
    if (manual) {
      closeToast()
      showFailToast('暂时无法连接更新服务，请稍后重试')
    }
  } finally {
    checking.value = false
  }
}

function handleManualUpdateCheck(): void {
  void checkForUpdate(true)
}

async function installUpdate(): Promise<void> {
  if (!update.value || downloading.value) return
  downloading.value = true
  waitingForPermission.value = false
  downloadProgress.value = 0
  try {
    const status = await downloadAndInstallUpdate(update.value)
    if (status === 'permission_required') {
      waitingForPermission.value = true
      showToast('授权后返回应用，将自动继续更新')
      return
    }
    showToast('安全校验通过，请在系统页面确认更新')
  } catch (error) {
    showFailToast(getUpdateErrorMessage(error))
  } finally {
    downloading.value = false
  }
}

async function resumeAfterPermission(): Promise<void> {
  if (!waitingForPermission.value || downloading.value) return
  try {
    if (await hasInstallPermission()) {
      waitingForPermission.value = false
      await installUpdate()
    }
  } catch {
    // Keep the update sheet available so the user can retry manually.
  }
}

function postponeUpdate(): void {
  if (!update.value?.mandatory) visible.value = false
}
</script>

<template>
  <van-popup v-model:show="visible" position="bottom" round :close-on-click-overlay="!update?.mandatory && !downloading">
    <section v-if="update" class="update-sheet" aria-label="应用更新">
      <div class="handle" aria-hidden="true"></div>
      <div class="update-heading">
        <span class="update-kicker">发现新版本</span>
        <strong>饮食追踪 {{ update.versionName }}</strong>
        <span>当前版本 {{ update.currentVersionName }}</span>
      </div>
      <ul class="release-notes">
        <li v-for="note in update.releaseNotes" :key="note">{{ note }}</li>
      </ul>
      <div v-if="downloading" class="download-status">
        <div><span>正在下载并校验</span><strong>{{ downloadProgress }}%</strong></div>
        <van-progress :percentage="downloadProgress" :show-pivot="false" stroke-width="7" color="#237a64" />
      </div>
      <p class="update-security">更新包将在应用私有缓存中下载，并核验 SHA-256、应用包名、版本号和签名证书。</p>
      <van-button block type="primary" :loading="downloading" :loading-text="`正在更新 ${downloadProgress}%`" @click="installUpdate">
        {{ waitingForPermission ? '授权后继续更新' : '立即更新' }}
      </van-button>
      <van-button v-if="!update.mandatory && !downloading" block plain type="primary" @click="postponeUpdate">稍后再说</van-button>
    </section>
  </van-popup>
</template>

<style scoped>
.update-sheet { padding: 12px 20px calc(24px + env(safe-area-inset-bottom)); }
.handle { width: 34px; height: 4px; margin: 0 auto 20px; border-radius: 2px; background: #d9e1dd; }
.update-heading { display: grid; gap: 6px; }
.update-heading strong { color: #173d34; font-size: 20px; }
.update-heading span:last-child { color: #76827d; font-size: 13px; }
.update-kicker { color: #237a64; font-size: 13px; font-weight: 700; }
.release-notes { margin: 18px 0 22px; padding-left: 20px; color: #42524c; font-size: 14px; line-height: 1.7; }
.release-notes :deep(li + li) { margin-top: 5px; }
.download-status { margin: -5px 0 16px; }
.download-status > div { display: flex; align-items: center; justify-content: space-between; margin-bottom: 7px; color: #64736d; font-size: 12px; }
.download-status strong { color: #237a64; font-size: 12px; }
.update-security { margin: 0 0 15px; color: #76827d; font-size: 11px; line-height: 1.55; }
.update-sheet :deep(.van-button + .van-button) { margin-top: 10px; }
</style>
