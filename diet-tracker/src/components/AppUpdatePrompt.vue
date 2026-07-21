<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { closeToast, showFailToast, showLoadingToast, showToast } from 'vant'
import {
  checkForAppUpdate,
  downloadAndInstallUpdate,
  supportsNativeAppUpdate,
  type AvailableUpdate,
} from '@/services/appUpdate'

const update = ref<AvailableUpdate | null>(null)
const visible = ref(false)
const downloading = ref(false)

onMounted(() => {
  if (!supportsNativeAppUpdate()) return
  window.setTimeout(async () => {
    try {
      update.value = await checkForAppUpdate()
      visible.value = Boolean(update.value)
    } catch {
      // A failed background check must not interrupt recording meals offline.
    }
  }, 1800)
})

async function installUpdate(): Promise<void> {
  if (!update.value || downloading.value) return
  downloading.value = true
  showLoadingToast({ message: '正在安全下载更新', forbidClick: true, duration: 0 })
  try {
    const status = await downloadAndInstallUpdate(update.value)
    closeToast()
    if (status === 'permission_required') {
      showToast('请允许“安装未知应用”后，再点击立即更新')
      return
    }
    showToast('已打开系统安装页')
  } catch {
    closeToast()
    showFailToast('更新下载失败，请稍后重试')
  } finally {
    downloading.value = false
  }
}

function postponeUpdate(): void {
  if (!update.value?.mandatory) visible.value = false
}
</script>

<template>
  <van-popup v-model:show="visible" position="bottom" round :close-on-click-overlay="!update?.mandatory">
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
      <van-button block type="primary" :loading="downloading" @click="installUpdate">立即更新</van-button>
      <van-button v-if="!update.mandatory" block plain type="primary" @click="postponeUpdate">稍后再说</van-button>
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
.update-sheet :deep(.van-button + .van-button) { margin-top: 10px; }
</style>
