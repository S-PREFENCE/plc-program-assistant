<template>
  <view class="monitor-container">
    <!-- 顶部状态栏 -->
    <view class="status-bar">
      <view class="status-info">
        <view class="status-indicator" :class="runState"></view>
        <text class="status-text">{{ statusText }}</text>
      </view>
      <view class="status-stats">
        <text class="stat-item">{{ isZhCN ? '扫描' : 'Scan' }}: {{ plcStore.scanCount }}</text>
        <text class="stat-item">{{ isZhCN ? '周期' : 'Cycle' }}: {{ plcStore.lastScanTime.toFixed(1) }}ms</text>
      </view>
    </view>

    <!-- PLC控制按钮 -->
    <view class="control-bar">
      <view class="control-btn" :class="{ active: plcStore.isRunning }" @tap="toggleRun">
        <text class="btn-icon">{{ plcStore.isRunning ? '⏸' : '▶' }}</text>
        <text class="btn-label">{{ plcStore.isRunning ? (isZhCN ? '运行中' : 'Running') : (isZhCN ? '启动' : 'Start') }}</text>
      </view>
      <view class="control-btn" :class="{ disabled: plcStore.isRunning }" @tap="stopPLC">
        <text class="btn-icon">⏹</text>
        <text class="btn-label">{{ isZhCN ? '停止' : 'Stop' }}</text>
      </view>
      <view class="control-btn" @tap="resetPLC">
        <text class="btn-icon">↻</text>
        <text class="btn-label">{{ isZhCN ? '复位' : 'Reset' }}</text>
      </view>
    </view>

    <!-- 梯形图监控画布 -->
    <view class="monitor-canvas-wrapper">
      <canvas
        type="2d"
        id="monitorCanvas"
        class="monitor-canvas"
        :style="{ transform: `scale(${zoomLevel / 100})` }"
      ></canvas>
    </view>

    <!-- 网络切换 -->
    <scroll-view class="network-tabs" scroll-x>
      <view 
        class="network-tab" 
        v-for="network in networks" 
        :key="network.id"
        :class="{ active: currentNetworkIndex === network.number - 1 }"
        @tap="selectNetwork(network.number - 1)"
      >
        <text>{{ network.number }}</text>
      </view>
    </scroll-view>

    <!-- 监控表 -->
    <view class="monitor-table">
      <view class="table-header">
        <text class="col-symbol">{{ isZhCN ? '符号' : 'Symbol' }}</text>
        <text class="col-address">{{ isZhCN ? '地址' : 'Address' }}</text>
        <text class="col-value">{{ isZhCN ? '值' : 'Value' }}</text>
        <text class="col-force">{{ isZhCN ? '强制' : 'Force' }}</text>
      </view>
      <scroll-view class="table-body" scroll-y>
        <view 
          class="table-row" 
          v-for="variable in variables" 
          :key="variable.id"
          @tap="showForceDialog(variable)"
        >
          <text class="col-symbol">{{ variable.symbol || '-' }}</text>
          <text class="col-address">{{ variable.address }}</text>
          <text class="col-value" :class="{ 'true': getValue(variable.address), 'false': !getValue(variable.address) }">
            {{ formatValue(getValue(variable.address), variable.dataType) }}
          </text>
          <view class="col-force">
            <text v-if="isForced(variable.address)" class="force-tag">F</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 定时器/计数器视图 -->
    <view class="timer-counter-view" v-if="hasTimersOrCounters">
      <view class="section-title">{{ isZhCN ? '定时器/计数器状态' : 'Timer/Counter Status' }}</view>
      <scroll-view class="tc-list" scroll-x>
        <view class="tc-item" v-for="[id, timer] in plcStore.timers" :key="id">
          <text class="tc-id">{{ id }}</text>
          <text class="tc-type">{{ timer.type }}</text>
          <view class="tc-progress">
            <view class="progress-bar" :style="{ width: (timer.ET / timer.PT * 100) + '%' }"></view>
          </view>
          <text class="tc-value">{{ timer.ET }} / {{ timer.PT }}</text>
        </view>
        <view class="tc-item" v-for="[id, counter] in plcStore.counters" :key="id">
          <text class="tc-id">{{ id }}</text>
          <text class="tc-type">{{ counter.type }}</text>
          <view class="tc-progress">
            <view class="progress-bar" :style="{ width: (counter.CV / counter.PV * 100) + '%' }"></view>
          </view>
          <text class="tc-value">{{ counter.CV }} / {{ counter.PV }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- TabBar占位 -->
    <view class="tab-bar-placeholder"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useProjectStore } from '@/store/project'
import { usePLCStore } from '@/store/plc'
import { useSettingsStore } from '@/store/settings'

const projectStore = useProjectStore()
const plcStore = usePLCStore()
const settingsStore = useSettingsStore()

// 画布
const canvas = ref<any>(null)
const ctx = ref<any>(null)
const canvasWidth = ref(375)
const canvasHeight = ref(400)

// 状态
const zoomLevel = ref(100)
const currentNetworkIndex = ref(0)
const updateTimer = ref<number | null>(null)

// 计算属性
const isZhCN = computed(() => settingsStore.isZhCN)
const networks = computed(() => projectStore.currentBlock?.networks || [])
const currentNetwork = computed(() => networks.value[currentNetworkIndex.value])
const variables = computed(() => projectStore.currentProject?.variables || [])
const runState = computed(() => plcStore.runState)

const statusText = computed(() => {
  switch (plcStore.runState) {
    case 'running': return isZhCN.value ? '运行中' : 'Running'
    case 'paused': return isZhCN.value ? '已暂停' : 'Paused'
    default: return isZhCN.value ? '已停止' : 'Stopped'
  }
})

const hasTimersOrCounters = computed(() => 
  plcStore.timers.size > 0 || plcStore.counters.size > 0
)

onMounted(() => {
  initCanvas()
  startUpdateLoop()
})

onUnmounted(() => {
  stopUpdateLoop()
})

function initCanvas() {
  const query = uni.createSelectorQuery()
  query.select('#monitorCanvas')
    .fields({ node: true, size: true })
    .exec((res: any) => {
      if (res[0] && res[0].node) {
        const node = res[0].node
        canvas.value = node
        ctx.value = node.getContext('2d')
        
        const dpr = wx.getWindowInfo().pixelRatio
        canvasWidth.value = res[0].width
        canvasHeight.value = res[0].height
        
        node.width = canvasWidth.value * dpr
        node.height = canvasHeight.value * dpr
        ctx.value.scale(dpr, dpr)
        
        drawMonitor()
      }
    })
}

function startUpdateLoop() {
  updateTimer.value = setInterval(() => {
    if (plcStore.isRunning) {
      drawMonitor()
    }
  }, 100) as unknown as number
}

function stopUpdateLoop() {
  if (updateTimer.value) {
    clearInterval(updateTimer.value)
  }
}

function drawMonitor() {
  if (!ctx.value) return
  
  const c = ctx.value
  const width = canvasWidth.value
  const height = canvasHeight.value
  
  // 清空
  c.clearRect(0, 0, width, height)
  
  // 绘制背景
  c.fillStyle = '#FFFFFF'
  c.fillRect(0, 0, width, height)
  
  // 绘制网格
  c.strokeStyle = '#E0E6EB'
  c.lineWidth = 0.5
  const gridSize = 40
  
  for (let x = 0; x < width; x += gridSize) {
    c.beginPath()
    c.moveTo(x, 0)
    c.lineTo(x, height)
    c.stroke()
  }
  for (let y = 0; y < height; y += gridSize) {
    c.beginPath()
    c.moveTo(0, y)
    c.lineTo(width, y)
    c.stroke()
  }
  
  // 绘制当前网络
  if (currentNetwork.value) {
    drawMonitorNetwork(c, currentNetwork.value)
  }
}

function drawMonitorNetwork(c: any, network: any) {
  const startX = 30
  const startY = 60
  const elementHeight = 80
  const leftRailX = startX
  const rightRailX = canvasWidth.value - 30
  
  // 绘制左母线
  c.strokeStyle = '#37474F'
  c.lineWidth = 4
  c.beginPath()
  c.moveTo(leftRailX, startY - 20)
  c.lineTo(leftRailX, startY + elementHeight + 20)
  c.stroke()
  
  // 绘制网络标题
  c.fillStyle = '#607D8B'
  c.font = '24rpx'
  c.fillText(`Network ${network.number}`, startX + 10, startY - 30)
  
  const centerY = startY + elementHeight / 2
  
  // 计算能流路径
  const powerFlows = calculatePowerFlow(network)
  
  // 绘制元件和能流
  network.elements.forEach((element: any, index: number) => {
    const elemX = startX + 60 + index * 150
    const powered = powerFlows[index] || false
    
    drawMonitorElement(c, element, elemX, centerY, powered)
  })
  
  // 绘制连接线和能流
  c.lineWidth = 3
  
  // 从左母线到第一个元件
  if (network.elements.length > 0) {
    const firstPowered = powerFlows[0] || false
    c.strokeStyle = firstPowered ? '#4CAF50' : '#37474F'
    c.beginPath()
    c.moveTo(leftRailX, centerY)
    c.lineTo(startX + 60, centerY)
    c.stroke()
    
    // 元件之间
    for (let i = 0; i < network.elements.length - 1; i++) {
      const fromPowered = powerFlows[i] || false
      const toPowered = powerFlows[i + 1] || false
      c.strokeStyle = toPowered ? '#4CAF50' : '#37474F'
      c.beginPath()
      c.moveTo(startX + 60 + i * 150 + 120, centerY)
      c.lineTo(startX + 60 + (i + 1) * 150, centerY)
      c.stroke()
    }
    
    // 最后一个到右母线
    const lastPowered = powerFlows[network.elements.length - 1] || false
    c.strokeStyle = lastPowered ? '#4CAF50' : '#37474F'
    c.beginPath()
    c.moveTo(startX + 60 + (network.elements.length - 1) * 150 + 120, centerY)
    c.lineTo(rightRailX, centerY)
    c.stroke()
  } else {
    // 没有元件，连接左右母线
    c.strokeStyle = '#37474F'
    c.beginPath()
    c.moveTo(leftRailX, centerY)
    c.lineTo(rightRailX, centerY)
    c.stroke()
  }
  
  // 绘制右母线
  c.strokeStyle = '#37474F'
  c.lineWidth = 4
  c.beginPath()
  c.moveTo(rightRailX, startY - 20)
  c.lineTo(rightRailX, startY + elementHeight + 20)
  c.stroke()
}

function calculatePowerFlow(network: any): boolean[] {
  const flows: boolean[] = []
  let power = true // 能流从左母线开始
  
  network.elements.forEach((element: any) => {
    const value = plcStore.getValue(element.address)
    
    switch (element.type) {
      case 'NO':
        power = power && value === true
        break
      case 'NC':
        power = power && value !== true
        break
      case 'COIL':
        // 线圈输出，不影响后续能流
        break
      case 'TON':
      case 'TOF':
      case 'TP':
      case 'TONR':
        // 定时器输出作为能流
        const timer = plcStore.timers.get(element.id)
        power = power && (timer?.Q || false)
        break
      default:
        power = power && (value === true || value > 0)
    }
    
    flows.push(power)
  })
  
  return flows
}

function drawMonitorElement(c: any, element: any, x: number, y: number, powered: boolean) {
  const width = 120
  const height = 60
  
  // 绘制引脚线
  c.strokeStyle = powered ? '#4CAF50' : '#37474F'
  c.lineWidth = 3
  c.beginPath()
  c.moveTo(x - 30, y)
  c.lineTo(x, y)
  c.moveTo(x + width, y)
  c.lineTo(x + width + 30, y)
  c.stroke()
  
  // 根据类型绘制元件
  if (['NO', 'NC'].includes(element.type)) {
    // 触点
    c.strokeStyle = powered ? '#4CAF50' : '#37474F'
    c.lineWidth = 2
    c.strokeRect(x, y - height/2, width, height)
    
    // 常闭斜线
    if (element.type === 'NC') {
      c.beginPath()
      c.moveTo(x, y - height/2)
      c.lineTo(x + width, y + height/2)
      c.stroke()
    }
    
    // 地址
    c.fillStyle = powered ? '#4CAF50' : '#37474F'
    c.font = '24rpx'
    c.textAlign = 'center'
    c.fillText(element.address || '', x + width/2, y + 8)
    
    // 值
    const value = plcStore.getValue(element.address)
    c.font = 'bold 20rpx'
    c.fillText(value ? '1' : '0', x + width/2, y - 15)
    
  } else if (element.type === 'COIL') {
    // 线圈
    c.strokeStyle = powered ? '#4CAF50' : '#37474F'
    c.lineWidth = 2
    c.strokeRect(x, y - height/2, width, height)
    
    // 地址
    c.fillStyle = powered ? '#4CAF50' : '#37474F'
    c.font = '24rpx'
    c.textAlign = 'center'
    c.fillText(element.address || '', x + width/2, y + 8)
    
    // 值
    const value = plcStore.getValue(element.address)
    c.font = 'bold 20rpx'
    c.fillText(value ? '1' : '0', x + width/2, y - 15)
    
  } else if (['TON', 'TOF', 'TP', 'TONR'].includes(element.type)) {
    // 定时器
    const timer = plcStore.timers.get(element.id)
    
    c.strokeStyle = powered ? '#4CAF50' : '#37474F'
    c.lineWidth = 2
    c.strokeRect(x, y - height/2, width, height)
    
    c.fillStyle = powered ? '#4CAF50' : '#37474F'
    c.font = 'bold 24rpx'
    c.textAlign = 'center'
    c.fillText(element.type, x + width/2, y - 10)
    
    c.font = '18rpx'
    c.fillText(`PT:${element.params.PT || 0}`, x + width/2, y + 5)
    
    if (timer) {
      c.font = 'bold 20rpx'
      c.fillText(`${timer.ET}/${timer.PT}`, x + width/2, y + 22)
    }
    
  } else {
    // 其他块
    c.strokeStyle = powered ? '#4CAF50' : '#37474F'
    c.lineWidth = 2
    c.strokeRect(x, y - height/2, width, height)
    
    c.fillStyle = powered ? '#4CAF50' : '#37474F'
    c.font = 'bold 24rpx'
    c.textAlign = 'center'
    c.fillText(element.type, x + width/2, y + 8)
  }
  
  // 能流高亮效果
  if (powered) {
    c.shadowColor = '#4CAF50'
    c.shadowBlur = 10
    c.strokeStyle = '#4CAF50'
    c.strokeRect(x - 2, y - height/2 - 2, width + 4, height + 4)
    c.shadowBlur = 0
  }
}

function getValue(address: string): any {
  return plcStore.getValue(address)
}

function formatValue(value: any, dataType: string): string {
  if (value === undefined || value === null) return '-'
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  return String(value)
}

function isForced(address: string): boolean {
  return plcStore.forcedValues.has(address)
}

function selectNetwork(index: number) {
  currentNetworkIndex.value = index
  drawMonitor()
}

function toggleRun() {
  if (plcStore.isRunning) {
    plcStore.stop()
  } else {
    if (!projectStore.currentProject) {
      uni.showToast({ title: isZhCN.value ? '请先打开项目' : 'Open a project first', icon: 'none' })
      return
    }
    plcStore.start()
  }
}

function stopPLC() {
  plcStore.stop()
}

function resetPLC() {
  uni.showModal({
    title: isZhCN.value ? '确认复位' : 'Confirm Reset',
    content: isZhCN.value ? '确定要复位PLC吗？这将清除所有内存和状态。' : 'Reset PLC? This will clear all memory and states.',
    success: (res) => {
      if (res.confirm) {
        plcStore.reset()
        drawMonitor()
      }
    }
  })
}

function showForceDialog(variable: any) {
  const currentValue = plcStore.getValue(variable.address)
  const isForced = plcStore.forcedValues.has(variable.address)
  
  uni.showModal({
    title: isZhCN.value ? '强制值设置' : 'Force Value',
    content: `${variable.address}: ${formatValue(currentValue, variable.dataType)}`,
    editable: true,
    placeholderText: isForced ? String(currentValue) : String(currentValue),
    success: (res) => {
      if (res.confirm && res.content !== undefined) {
        const value = variable.dataType === 'BOOL' 
          ? (res.content === '1' || res.content === 'true' || res.content === 'TRUE')
          : Number(res.content)
        plcStore.forceValue(variable.address, value)
        drawMonitor()
      } else if (res.cancel && isForced) {
        plcStore.unforceValue(variable.address)
        drawMonitor()
      }
    }
  })
}
</script>

<style lang="scss" scoped>
@import '@/styles/common.scss';

.monitor-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: $bg-page;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-sm $spacing-md;
  background: $bg-card;
  border-bottom: 1rpx solid $border-color;
}

.status-info {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.status-indicator {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: $text-disabled;
  
  &.running {
    background: $success-color;
    animation: pulse 1s infinite;
  }
  
  &.paused {
    background: $warning-color;
  }
  
  &.stopped {
    background: $error-color;
  }
}

.status-text {
  font-size: $font-sm;
  color: $text-primary;
}

.status-stats {
  display: flex;
  gap: $spacing-md;
}

.stat-item {
  font-size: $font-xs;
  color: $text-secondary;
}

.control-bar {
  display: flex;
  justify-content: center;
  gap: $spacing-md;
  padding: $spacing-sm $spacing-md;
  background: $bg-card;
  border-bottom: 1rpx solid $border-color;
}

.control-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $spacing-sm $spacing-lg;
  background: $bg-input;
  border-radius: $radius-md;
  
  &.active {
    background: $success-color;
    
    .btn-icon, .btn-label {
      color: $text-white;
    }
  }
  
  &.disabled {
    opacity: 0.5;
  }
  
  .btn-icon {
    font-size: 40rpx;
    margin-bottom: 4rpx;
  }
  
  .btn-label {
    font-size: $font-xs;
    color: $text-secondary;
  }
}

.monitor-canvas-wrapper {
  height: 300rpx;
  background: $bg-card;
  display: flex;
  align-items: center;
  justify-content: center;
}

.monitor-canvas {
  background: $bg-card;
}

.network-tabs {
  display: flex;
  padding: $spacing-sm $spacing-md;
  background: $bg-card;
  border-bottom: 1rpx solid $border-color;
  white-space: nowrap;
}

.network-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 64rpx;
  height: 56rpx;
  padding: 0 $spacing-sm;
  margin-right: $spacing-xs;
  background: $bg-input;
  border-radius: $radius-sm;
  font-size: $font-sm;
  color: $text-secondary;
  
  &.active {
    background: $primary-color;
    color: $text-white;
  }
}

.monitor-table {
  flex: 1;
  background: $bg-card;
  margin: $spacing-md;
  border-radius: $radius-md;
  overflow: hidden;
}

.table-header {
  display: flex;
  padding: $spacing-sm $spacing-md;
  background: $bg-panel;
  font-size: $font-sm;
  font-weight: 600;
  color: $text-secondary;
  border-bottom: 1rpx solid $border-color;
}

.table-body {
  max-height: 300rpx;
}

.table-row {
  display: flex;
  padding: $spacing-sm $spacing-md;
  border-bottom: 1rpx solid $border-light;
  
  &:active {
    background: $bg-panel;
  }
  
  .col-symbol {
    flex: 2;
    font-size: $font-sm;
    color: $text-primary;
  }
  
  .col-address {
    flex: 2;
    font-size: $font-sm;
    color: $primary-color;
    font-family: monospace;
  }
  
  .col-value {
    flex: 1;
    font-size: $font-sm;
    font-weight: 600;
    text-align: center;
    font-family: monospace;
    
    &.true {
      color: $success-color;
    }
    
    &.false {
      color: $text-disabled;
    }
  }
  
  .col-force {
    flex: 0.5;
    text-align: center;
    
    .force-tag {
      display: inline-block;
      padding: 2rpx $spacing-xs;
      background: $warning-color;
      color: $text-white;
      font-size: $font-xs;
      border-radius: $radius-sm;
    }
  }
}

.timer-counter-view {
  padding: $spacing-sm $spacing-md $spacing-lg;
  background: $bg-card;
}

.section-title {
  font-size: $font-sm;
  font-weight: 600;
  color: $text-secondary;
  margin-bottom: $spacing-sm;
}

.tc-list {
  display: flex;
  white-space: nowrap;
}

.tc-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  min-width: 160rpx;
  padding: $spacing-sm;
  margin-right: $spacing-sm;
  background: $bg-input;
  border-radius: $radius-sm;
}

.tc-id {
  font-size: $font-xs;
  color: $text-secondary;
}

.tc-type {
  font-size: $font-sm;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: $spacing-xs;
}

.tc-progress {
  width: 100%;
  height: 8rpx;
  background: $border-color;
  border-radius: 4rpx;
  margin-bottom: $spacing-xs;
  
  .progress-bar {
    height: 100%;
    background: $primary-color;
    border-radius: 4rpx;
    transition: width 0.1s;
  }
}

.tc-value {
  font-size: $font-xs;
  color: $text-secondary;
}

.tab-bar-placeholder {
  height: 100rpx;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>