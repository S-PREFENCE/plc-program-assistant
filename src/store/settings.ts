/**
 * 设置Store - 全局配置管理
 */
import { defineStore } from 'pinia'

interface SettingsState {
  language: 'zh-CN' | 'en-US'
  theme: 'light'
  scanTime: number  // PLC扫描周期 ms
  gridEnabled: boolean
  autoSave: boolean
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    language: 'zh-CN',
    theme: 'light',
    scanTime: 20,
    gridEnabled: true,
    autoSave: true
  }),
  
  actions: {
    loadSettings() {
      try {
        const settings = uni.getStorageSync('settings')
        if (settings) {
          Object.assign(this, settings)
        }
      } catch (e) {
        console.error('加载设置失败:', e)
      }
    },
    
    saveSettings() {
      try {
        uni.setStorageSync('settings', {
          language: this.language,
          theme: this.theme,
          scanTime: this.scanTime,
          gridEnabled: this.gridEnabled,
          autoSave: this.autoSave
        })
      } catch (e) {
        console.error('保存设置失败:', e)
      }
    },
    
    toggleLanguage() {
      this.language = this.language === 'zh-CN' ? 'en-US' : 'zh-CN'
      this.saveSettings()
    },
    
    setScanTime(time: number) {
      this.scanTime = time
      this.saveSettings()
    }
  },
  
  getters: {
    isZhCN: (state) => state.language === 'zh-CN',
    isEnUS: (state) => state.language === 'en-US'
  }
})
