<template>
  <view class="tools-container">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">{{ isZhCN ? '工具' : 'Tools' }}</text>
    </view>

    <!-- 工具分类 -->
    <view class="tools-grid">
      <!-- 模拟量换算 -->
      <view class="tool-card" @tap="openTool('analog')">
        <view class="tool-icon">📊</view>
        <text class="tool-name">{{ isZhCN ? '模拟量换算' : 'Analog Convert' }}</text>
        <text class="tool-desc">{{ isZhCN ? '4-20mA / 0-10V ↔ 工程值' : 'Current/Voltage ↔ Engineering' }}</text>
      </view>

      <!-- 进制转换 -->
      <view class="tool-card" @tap="openTool('converter')">
        <view class="tool-icon">🔢</view>
        <text class="tool-name">{{ isZhCN ? '进制转换器' : 'Base Converter' }}</text>
        <text class="tool-desc">{{ isZhCN ? 'BIN/DEC/HEX/BCD 互转' : 'BIN/DEC/HEX/BCD conversion' }}</text>
      </view>

      <!-- 定时器计算 -->
      <view class="tool-card" @tap="openTool('timer')">
        <view class="tool-icon">⏱️</view>
        <text class="tool-name">{{ isZhCN ? '定时器计算' : 'Timer Calc' }}</text>
        <text class="tool-desc">{{ isZhCN ? '时间 ↔ PT 值转换' : 'Time ↔ PT value' }}</text>
      </view>

      <!-- 指令速查 -->
      <view class="tool-card" @tap="openTool('reference')">
        <view class="tool-icon">📖</view>
        <text class="tool-name">{{ isZhCN ? '指令速查' : 'Instruction Ref' }}</text>
        <text class="tool-desc">{{ isZhCN ? '梯形图指令说明与示例' : 'Ladder instructions guide' }}</text>
      </view>

      <!-- 典型电路库 -->
      <view class="tool-card" @tap="openTool('circuits')">
        <view class="tool-icon">⚡</view>
        <text class="tool-name">{{ isZhCN ? '典型电路库' : 'Circuit Library' }}</text>
        <text class="tool-desc">{{ isZhCN ? '起保停、星三角等模板' : 'Templates: Start-stop, Star-delta' }}</text>
      </view>

      <!-- 地址计算 -->
      <view class="tool-card" @tap="openTool('address')">
        <view class="tool-icon">📍</view>
        <text class="tool-name">{{ isZhCN ? '地址计算' : 'Address Calc' }}</text>
        <text class="tool-desc">{{ isZhCN ? '位/字节/字/双字寻址' : 'Bit/Byte/Word/DWord' }}</text>
      </view>
    </view>

    <!-- TabBar占位 -->
    <view class="tab-bar-placeholder"></view>

    <!-- 模拟量换算弹窗 -->
    <view class="modal-mask" v-if="showAnalogModal" @tap="closeModal">
      <view class="tool-modal" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">{{ isZhCN ? '模拟量换算' : 'Analog Convert' }}</text>
          <text class="modal-close" @tap="closeModal">×</text>
        </view>
        <view class="modal-body">
          <view class="form-row">
            <view class="form-item">
              <text class="form-label">{{ isZhCN ? '输入类型' : 'Input Type' }}</text>
              <picker :value="analogTypeIndex" :range="analogTypes" @change="onAnalogTypeChange">
                <view class="picker-value">{{ analogTypes[analogTypeIndex] }}</view>
              </picker>
            </view>
          </view>
          <view class="form-row">
            <view class="form-item">
              <text class="form-label">{{ isZhCN ? '工程最小值' : 'Min Range' }}</text>
              <input class="form-input" type="digit" v-model.number="analogMinRange" />
            </view>
            <view class="form-item">
              <text class="form-label">{{ isZhCN ? '工程最大值' : 'Max Range' }}</text>
              <input class="form-input" type="digit" v-model.number="analogMaxRange" />
            </view>
          </view>
          <view class="form-row">
            <view class="form-item">
              <text class="form-label">{{ isZhCN ? '输入值' : 'Input Value' }}</text>
              <input class="form-input" type="digit" v-model.number="analogInput" @blur="calculateAnalog" />
            </view>
          </view>
          <view class="result-box">
            <view class="result-item">
              <text class="result-label">mA</text>
              <text class="result-value">{{ analogResult.mA.toFixed(2) }}</text>
            </view>
            <view class="result-item">
              <text class="result-label">V</text>
              <text class="result-value">{{ analogResult.V.toFixed(2) }}</text>
            </view>
            <view class="result-item">
              <text class="result-label">{{ isZhCN ? '工程值' : 'Value' }}</text>
              <text class="result-value">{{ analogResult.engineering.toFixed(2) }}</text>
            </view>
            <view class="result-item">
              <text class="result-label">HEX</text>
              <text class="result-value">{{ analogResult.hex }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 进制转换弹窗 -->
    <view class="modal-mask" v-if="showConverterModal" @tap="closeModal">
      <view class="tool-modal" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">{{ isZhCN ? '进制转换器' : 'Base Converter' }}</text>
          <text class="modal-close" @tap="closeModal">×</text>
        </view>
        <view class="modal-body">
          <view class="form-item full">
            <text class="form-label">{{ isZhCN ? '输入值' : 'Input' }}</text>
            <input class="form-input large" type="text" v-model="convInput" @input="calculateConvert" />
          </view>
          <view class="base-tabs">
            <view 
              class="base-tab" 
              :class="{ active: convBase === 2 }"
              @tap="convBase = 2; calculateConvert()"
            >BIN</view>
            <view 
              class="base-tab" 
              :class="{ active: convBase === 10 }"
              @tap="convBase = 10; calculateConvert()"
            >DEC</view>
            <view 
              class="base-tab" 
              :class="{ active: convBase === 16 }"
              @tap="convBase = 16; calculateConvert()"
            >HEX</view>
          </view>
          <view class="result-box">
            <view class="result-item">
              <text class="result-label">BIN</text>
              <text class="result-value">{{ convResult.bin }}</text>
            </view>
            <view class="result-item">
              <text class="result-label">DEC</text>
              <text class="result-value">{{ convResult.dec }}</text>
            </view>
            <view class="result-item">
              <text class="result-label">HEX</text>
              <text class="result-value">{{ convResult.hex }}</text>
            </view>
            <view class="result-item">
              <text class="result-label">BCD</text>
              <text class="result-value">{{ convResult.bcd }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 定时器计算弹窗 -->
    <view class="modal-mask" v-if="showTimerModal" @tap="closeModal">
      <view class="tool-modal" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">{{ isZhCN ? '定时器计算' : 'Timer Calculator' }}</text>
          <text class="modal-close" @tap="closeModal">×</text>
        </view>
        <view class="modal-body">
          <view class="form-row">
            <view class="form-item">
              <text class="form-label">{{ isZhCN ? '时间 (ms)' : 'Time (ms)' }}</text>
              <input class="form-input" type="digit" v-model.number="timerInput" @input="calculateTimer" />
            </view>
            <view class="form-item">
              <text class="form-label">{{ isZhCN ? '时间 (s)' : 'Time (s)' }}</text>
              <input class="form-input" type="digit" v-model.number="timerSeconds" @input="calculateTimerFromSeconds" />
            </view>
          </view>
          <view class="form-item">
            <text class="form-label">PT {{ isZhCN ? '预设值' : 'Preset' }}</text>
            <input class="form-input" type="number" v-model.number="timerPT" @input="calculateTimerFromPT" />
          </view>
          <view class="result-box">
            <view class="result-item">
              <text class="result-label">PT (S5T#)</text>
              <text class="result-value">{{ timerResult.s5t }}</text>
            </view>
            <view class="result-item">
              <text class="result-label">PT (INT)</text>
              <text class="result-value">{{ timerResult.int }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSettingsStore } from '@/store/settings'

const settingsStore = useSettingsStore()

// 状态
const isZhCN = computed(() => settingsStore.isZhCN)

// 弹窗状态
const showAnalogModal = ref(false)
const showConverterModal = ref(false)
const showTimerModal = ref(false)

// 模拟量换算
const analogTypes = computed(() => 
  isZhCN.value 
    ? ['4-20mA', '0-10V', '0-5V', '±10V'] 
    : ['4-20mA', '0-10V', '0-5V', '±10V']
)
const analogTypeIndex = ref(0)
const analogMinRange = ref(0)
const analogMaxRange = ref(1000)
const analogInput = ref(10)
const analogResult = ref({
  mA: 0,
  V: 0,
  engineering: 0,
  hex: '0000'
})

// 进制转换
const convInput = ref('255')
const convBase = ref(10)
const convResult = ref({
  bin: '0',
  dec: '0',
  hex: '0',
  bcd: '0'
})

// 定时器计算
const timerInput = ref(1000)
const timerSeconds = ref(1)
const timerPT = ref(1000)
const timerResult = ref({
  s5t: 'S5T#1S',
  int: 1000
})

// 工具打开
function openTool(tool: string) {
  switch (tool) {
    case 'analog':
      showAnalogModal.value = true
      calculateAnalog()
      break
    case 'converter':
      showConverterModal.value = true
      calculateConvert()
      break
    case 'timer':
      showTimerModal.value = true
      calculateTimer()
      break
    case 'reference':
      uni.showToast({ title: isZhCN.value ? '功能开发中' : 'Coming soon', icon: 'none' })
      break
    case 'circuits':
      uni.showToast({ title: isZhCN.value ? '功能开发中' : 'Coming soon', icon: 'none' })
      break
    case 'address':
      uni.showToast({ title: isZhCN.value ? '功能开发中' : 'Coming soon', icon: 'none' })
      break
  }
}

function closeModal() {
  showAnalogModal.value = false
  showConverterModal.value = false
  showTimerModal.value = false
}

// 模拟量计算
function onAnalogTypeChange(e: any) {
  analogTypeIndex.value = e.detail.value
  calculateAnalog()
}

function calculateAnalog() {
  const types = [
    { minMA: 4, maxMA: 20, minV: 0, maxV: 10 },
    { minMA: 0, maxMA: 20, minV: 0, maxV: 10 },
    { minMA: 0, maxMA: 20, minV: 0, maxV: 5 },
    { minMA: 0, maxMA: 20, minV: -10, maxV: 10 }
  ]
  
  const type = types[analogTypeIndex.value]
  const range = analogMaxRange.value - analogMinRange.value
  
  // mA和V计算
  analogResult.value.mA = type.minMA + (analogInput.value / range) * (type.maxMA - type.minMA)
  analogResult.value.V = type.minV + (analogInput.value / range) * (type.maxV - type.minV)
  
  // 工程值
  analogResult.value.engineering = analogMinRange.value + ((analogResult.value.mA - 4) / 16) * range
  
  // HEX (假设0-27648对应0-100%)
  const raw = Math.round((analogInput.value / range) * 27648)
  analogResult.value.hex = raw.toString(16).toUpperCase().padStart(4, '0')
}

// 进制转换
function calculateConvert() {
  let decimal = 0
  
  try {
    switch (convBase.value) {
      case 2:
        decimal = parseInt(convInput.value, 2)
        break
      case 10:
        decimal = parseInt(convInput.value, 10)
        break
      case 16:
        decimal = parseInt(convInput.value, 16)
        break
    }
    
    if (isNaN(decimal)) decimal = 0
    
    convResult.value = {
      bin: decimal.toString(2),
      dec: decimal.toString(10),
      hex: decimal.toString(16).toUpperCase(),
      bcd: decimalToBCD(decimal)
    }
  } catch (e) {
    convResult.value = { bin: '-', dec: '-', hex: '-', bcd: '-' }
  }
}

function decimalToBCD(dec: number): string {
  if (dec < 0 || dec > 9999) return '-'
  let bcd = 0
  let multiplier = 1
  while (dec > 0) {
    const digit = dec % 10
    bcd += digit * multiplier
    multiplier *= 16
    dec = Math.floor(dec / 10)
  }
  return bcd.toString(16).toUpperCase().padStart(4, '0')
}

// 定时器计算
function calculateTimer() {
  timerSeconds.value = timerInput.value / 1000
  timerPT.value = timerInput.value
  
  const s = timerInput.value / 1000
  if (s < 10) {
    timerResult.value.s5t = `S5T#${s.toFixed(1)}S`
  } else if (s < 600) {
    timerResult.value.s5t = `S5T#${Math.floor(s)}S`
  } else {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    timerResult.value.s5t = `S5T#${m}M${sec}S`
  }
  timerResult.value.int = timerInput.value
}

function calculateTimerFromSeconds() {
  timerInput.value = timerSeconds.value * 1000
  calculateTimer()
}

function calculateTimerFromPT() {
  timerInput.value = timerPT.value
  timerSeconds.value = timerPT.value / 1000
  calculateTimer()
}
</script>

<style lang="scss" scoped>
@import '@/styles/common.scss';

.tools-container {
  min-height: 100vh;
  background: $bg-page;
  padding: $spacing-md;
  padding-bottom: 200rpx;
}

.page-header {
  padding: $spacing-md 0;
  margin-bottom: $spacing-md;
}

.page-title {
  font-size: $font-xxl;
  font-weight: 600;
  color: $text-primary;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-md;
}

.tool-card {
  background: $bg-card;
  border-radius: $radius-md;
  padding: $spacing-lg;
  box-shadow: $shadow-light;
  
  &:active {
    opacity: 0.8;
  }
}

.tool-icon {
  font-size: 64rpx;
  margin-bottom: $spacing-sm;
}

.tool-name {
  display: block;
  font-size: $font-md;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 4rpx;
}

.tool-desc {
  display: block;
  font-size: $font-xs;
  color: $text-secondary;
  line-height: 1.4;
}

.tab-bar-placeholder {
  height: 100rpx;
}

.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.tool-modal {
  width: 100%;
  max-width: 700rpx;
  max-height: 80vh;
  background: $bg-card;
  border-radius: $radius-lg $radius-lg 0 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-md;
  border-bottom: 1rpx solid $border-color;
  flex-shrink: 0;
}

.modal-title {
  font-size: $font-lg;
  font-weight: 600;
  color: $text-primary;
}

.modal-close {
  font-size: $font-xxl;
  color: $text-secondary;
  line-height: 1;
}

.modal-body {
  padding: $spacing-md;
  overflow-y: auto;
}

.form-row {
  display: flex;
  gap: $spacing-md;
  margin-bottom: $spacing-md;
}

.form-item {
  flex: 1;
  
  &.full {
    margin-bottom: $spacing-md;
  }
}

.form-label {
  display: block;
  font-size: $font-sm;
  color: $text-secondary;
  margin-bottom: $spacing-xs;
}

.form-input {
  width: 100%;
  padding: $spacing-sm $spacing-md;
  background: $bg-input;
  border: 1rpx solid $border-color;
  border-radius: $radius-sm;
  font-size: $font-md;
  
  &.large {
    padding: $spacing-md;
    font-size: $font-lg;
    text-align: center;
  }
}

.picker-value {
  padding: $spacing-sm $spacing-md;
  background: $bg-input;
  border: 1rpx solid $border-color;
  border-radius: $radius-sm;
  font-size: $font-md;
}

.base-tabs {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
}

.base-tab {
  flex: 1;
  padding: $spacing-sm;
  background: $bg-input;
  border-radius: $radius-sm;
  text-align: center;
  font-size: $font-sm;
  font-weight: 600;
  color: $text-secondary;
  
  &.active {
    background: $primary-color;
    color: $text-white;
  }
}

.result-box {
  background: $bg-panel;
  border-radius: $radius-md;
  padding: $spacing-md;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-sm;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-xs 0;
}

.result-label {
  font-size: $font-sm;
  color: $text-secondary;
}

.result-value {
  font-size: $font-md;
  font-weight: 600;
  color: $primary-color;
  font-family: monospace;
}
</style>
