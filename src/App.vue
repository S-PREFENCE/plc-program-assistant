<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useSettingsStore } from '@/store/settings'

onLaunch(() => {
  console.log('App Launch')
  // 初始化设置
  const settingsStore = useSettingsStore()
  settingsStore.loadSettings()
})

onShow(() => {
  console.log('App Show')
})

onHide(() => {
  console.log('App Hide')
})
</script>

<style lang="scss">
@import '@/styles/common.scss';
</style>
