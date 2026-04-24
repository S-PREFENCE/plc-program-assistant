<template>
  <view class="monitor-page">
    <!-- 顶部状态栏 -->
    <view class="status-bar">
      <view class="status-left">
        <text class="status-text" :class="plcStateClass">{{ plcStateText }}</text>
        <text class="scan-time" v-if="plcStore.isRunning">扫描: {{ plcStore.scanStats.lastScanTime.toFixed(1) }}ms</text>
      </view>
      <view class="status-right">
        <text class="scan-count" v-if="plcStore.isRunning">扫描 #{{ plcStore.scanStats.scanCount }}</text>
      </view>
    </view>
    
    <!-- 控制按钮 -->
    <view class="control-bar">
      <view class="control-btn" @click="toggleRun" :class="runClass">
        <text class="btn-icon">{{ plcStore.isRunning ? '⏸' : '▶' }}</text>
        <text class="btn-text">{{ plcStore.isRunning ? '暂停' : '运行' }}</text>
      </view>
      <view class="control-btn stop" @click="stopPLC">
        <text class="btn-icon">⏹</text>
        <text class="btn-text">停止</text>
      </view>
      <view class="control-btn reset" @click="resetPLC">
        <text class="btn-icon">↺</text>
        <text class="btn-text">复位</text>
      </view>
    </view>
    
    <!-- 梯形图监控视图 -->
    <view class="monitor-canvas-container">
      <canvas
        id="monitorCanvas"
        canvas-id="monitorCanvas"
        class="monitor-canvas"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      />
    </view>
    
    <!-- 输入模拟面板 -->
    <view class="input-panel">
      <view class="panel-header">
        <text class="panel-title">输入模拟</text>
        <text class="panel-subtitle">点击切换输入状态</text>
      </view>
      <view class="input-grid">
        <view 
          v-for="input in inputs" 
          :key="input.address"
          class="input-item"
          :class="{ active: input.value }"
          @click="toggleInput(input.address)"
        >
          <text class="input-address">{{ input.address }}</text>
          <text class="input-value">{{ input.value ? '1' : '0' }}</text>
        </view>
      </view>
    </view>
    
    <!-- 监控表 -->
    <view class="monitor-table-container">
      <view class="table-header">
        <text class="table-title">监控表</text>
        <view class="table-actions">
          <text class="action-btn" @click="addMonitorItem">+ 添加</text>
          <text class="action-btn" @click="clearMonitorItems">清空</text>
        </view>
      </view>
      
      <view class="monitor-table">
        <view class="table-row header">
          <text class="col-address">地址</text>
          <text class="col-value">值</text>
          <text class="col-action">操作</text>
        </view>
        
        <scroll-view class="table-body" scroll-y>
          <view 
            v-for="item in plcStore.monitorItems" 
            :key="item.id"
            class="table-row"
            :class="{ forced: item.forced }"
          >
            <text class="col-address">{{ item.address }}</text>
            <text class="col-value" @click="editValue(item)">
              {{ plcStore.formatValue(item.value, item.displayFormat) }}
            </text>
            <view class="col-action">
              <text 
                class="action-btn" 
                @click="toggleForce(item)"
              >
                {{ item.forced ? '取消强制' : '强制' }}
              </text>
            </view>
          </view>
          
          <view v-if="plcStore.monitorItems.length === 0" class="empty-tip">
            <text>暂无监控项，点击上方"添加"按钮添加</text>
          </view>
        </scroll-view>
      </view>
    </view>
    
    <!-- 添加监控项弹窗 -->
    <view class="modal" v-if="showAddModal" @click="closeAddModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">添加监控项</text>
          <text class="modal-close" @click="closeAddModal">✕</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">地址</text>
            <input 
              class="form-input" 
              v-model="newMonitorAddress" 
              placeholder="如: I0.0, Q0.1, MW0"
            />
          </view>
          <view class="form-item">
            <text class="form-label">数据类型</text>
            <picker :value="dataTypeIndex" :range="dataTypes" @change="onDataTypeChange">
              <view class="picker-value">{{ dataTypes[dataTypeIndex] }}</view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">显示格式</text>
            <picker :value="formatIndex" :range="formats" @change="onFormatChange">
              <view class="picker-value">{{ formats[formatIndex] }}</view>
            </picker>
          </view>
        </view>
        <view class="modal-footer">
          <text class="btn-cancel" @click="closeAddModal">取消</text>
          <text class="btn-confirm" @click="confirmAddMonitor">确定</text>
        </view>
      </view>
    </view>
    
    <!-- 强制值弹窗 -->
    <view class="modal" v-if="showForceModal" @click="closeForceModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">强制设置值</text>
          <text class="modal-close" @click="closeForceModal">✕</text>
        </view>
        <view class="modal-body">
          <view class="force-info">
            <text class="force-address">{{ forceTargetItem?.address }}</text>
            <text class="force-current">当前值: {{ plcStore.formatValue(forceTargetItem?.value, forceTargetItem?.displayFormat || 'dec') }}</text>
          </view>
          <view class="form-item" v-if="forceTargetItem?.dataType === 'BOOL'">
            <text class="form-label">设置值</text>
            <view class="bool-btns">
              <text class="bool-btn" :class="{ active: forceValue === true }" @click="forceValue = true">TRUE</text>
              <text class="bool-btn" :class="{ active: forceValue === false }" @click="forceValue = false">FALSE</text>
            </view>
          </view>
          <view class="form-item" v-else>
            <text class="form-label">设置值</text>
            <input class="form-input" v-model="forceValue" type="number" placeholder="输入数值" />
          </view>
        </view>
        <view class="modal-footer">
          <text class="btn-cancel" @click="closeForceModal">取消</text>
          <text class="btn-confirm" @click="confirmForce">确定</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { usePLCStore } from '@/store/plc'
import { useProjectStore } from '@/store/project'
import { PLCState } from '@/engine/PLCEngine'

// Store
const plcStore = usePLCStore()
const projectStore = useProjectStore()

// 状态
const showAddModal = ref(false)
const showForceModal = ref(false)
const newMonitorAddress = ref('')
const dataTypeIndex = ref(0)
const formatIndex = ref(0)
const forceTargetItem = ref<any>(null)
const forceValue = ref<boolean | number>(0)

// Canvas相关
const canvasWidth = ref(0)
const canvasHeight = ref(200)
const dpr = ref(1)

// 数据类型选项
const dataTypes = ['BOOL', 'BYTE', 'WORD', 'DWORD', 'INT', 'DINT', 'REAL']
const formats = ['dec', 'hex', 'bin', 'real']

// 输入模拟数据
const inputs = ref([
  { address: 'I0.0', value: false },
  { address: 'I0.1', value: false },
  { address: 'I0.2', value: false },
  { address: 'I0.3', value: false },
  { address: 'I0.4', value: false },
  { address: 'I0.5', value: false },
  { address: 'I0.6', value: false },
  { address: 'I0.7', value: false },
])

// 计算属性
const plcStateText = computed(() => {
  switch (plcStore.state) {
    case PLCState.Running: return '运行中'
    case PLCState.Paused: return '已暂停'
    case PLCState.Stopped: return '已停止'
    default: return '未知'
  }
})

const plcStateClass = computed(() => {
  switch (plcStore.state) {
    case PLCState.Running: return 'running'
    case PLCState.Paused: return 'paused'
    case PLCState.Stopped: return 'stopped'
    default: return ''
  }
})

const runClass = computed(() => {
  return plcStore.isRunning ? 'running' : ''
})

// 生命周期
onMounted(() => {
  plcStore.init()
  
  // 获取屏幕宽度
  const sysInfo = uni.getSystemInfoSync()
  canvasWidth.value = sysInfo.windowWidth
  dpr.value = sysInfo.pixelRatio
  
  // 初始化监控项
  plcStore.monitorItems = [
    { id: 'm1', address: 'Q0.0', value: null, dataType: 'BOOL', forced: false, displayFormat: 'dec' },
    { id: 'm2', address: 'Q0.1', value: null, dataType: 'BOOL', forced: false, displayFormat: 'dec' },
    { id: 'm3', address: 'M0.0', value: null, dataType: 'BOOL', forced: false, displayFormat: 'dec' },
    { id: 'm4', address: 'M0.1', value: null, dataType: 'BOOL', forced: false, displayFormat: 'dec' },
  ]
  
  // 开始监控循环
  startMonitorLoop()
})

onUnmounted(() => {
  stopMonitorLoop()
})

// 监控循环
let monitorInterval: number | null = null

function startMonitorLoop() {
  if (monitorInterval) return
  monitorInterval = setInterval(() => {
    plcStore.updateMonitorValues()
    plcStore.updateTimerCounterStates()
    drawPowerFlow()
  }, 100) as any
}

function stopMonitorLoop() {
  if (monitorInterval) {
    clearInterval(monitorInterval)
    monitorInterval = null
  }
}

// 控制方法
function toggleRun() {
  plcStore.toggleRunPause()
}

function stopPLC() {
  plcStore.stop()
}

function resetPLC() {
  plcStore.reset()
  // 重置输入
  inputs.value.forEach(input => input.value = false)
}

// 输入切换
function toggleInput(address: string) {
  const input = inputs.value.find(i => i.address === address)
  if (input) {
    input.value = !input.value
    plcStore.setInput(address, input.value)
  }
}

// 监控项管理
function addMonitorItem() {
  newMonitorAddress.value = ''
  dataTypeIndex.value = 0
  formatIndex.value = 0
  showAddModal.value = true
}

function closeAddModal() {
  showAddModal.value = false
}

function onDataTypeChange(e: any) {
  dataTypeIndex.value = e.detail.value
}

function onFormatChange(e: any) {
  formatIndex.value = e.detail.value
}

function confirmAddMonitor() {
  if (!newMonitorAddress.value.trim()) {
    uni.showToast({ title: '请输入地址', icon: 'none' })
    return
  }
  
  plcStore.addMonitorItem(
    newMonitorAddress.value.trim(),
    dataTypes[dataTypeIndex.value],
    formats[formatIndex.value] as any
  )
  
  closeAddModal()
}

function clearMonitorItems() {
  plcStore.clearMonitorItems()
}

// 强制功能
function editValue(item: any) {
  forceTargetItem.value = item
  forceValue.value = item.value ?? 0
  showForceModal.value = true
}

function closeForceModal() {
  showForceModal.value = false
  forceTargetItem.value = null
}

function toggleForce(item: any) {
  if (item.forced) {
    plcStore.unforceValue(item.address)
  } else {
    editValue(item)
  }
}

function confirmForce() {
  if (forceTargetItem.value) {
    plcStore.forceValue(forceTargetItem.value.address, forceValue.value)
    closeForceModal()
  }
}

// Canvas绘制
function onTouchStart(e: any) {
  // 处理触摸开始
}

function onTouchMove(e: any) {
  // 处理触摸移动
}

function onTouchEnd(e: any) {
  // 处理触摸结束
}

// 绘制能流
function drawPowerFlow() {
  // 获取Canvas上下文
  const ctx = uni.createCanvasContext('monitorCanvas')
  
  // 清除画布
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)
  
  // 绘制背景
  ctx.setFillStyle('#E8EEF2')
  ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value)
  
  // 获取程序
  const program = projectStore.currentProgram
  if (!program?.ob1?.length) {
    ctx.setFillStyle('#607D8B')
    ctx.setFontSize(14)
    ctx.fillText('暂无程序，请先在编辑器中创建', 20, 40)
    ctx.draw()
    return
  }
  
  // 绘制每个网络
  const networkY = 20
  const elementWidth = 60
  const elementHeight = 50
  const leftRailX = 30
  const spacing = 20
  
  program.ob1.forEach((network, netIndex) => {
    const networkTop = networkY + netIndex * 80
    const railY = networkTop + elementHeight / 2
    
    // 绘制网络背景
    ctx.setFillStyle('#fff')
    ctx.fillRect(10, networkTop - 5, canvasWidth.value - 20, 70)
    
    // 绘制网络标题
    ctx.setFillStyle('#37474F')
    ctx.setFontSize(12)
    ctx.fillText(`网络 ${netIndex + 1}`, 15, networkTop + 8)
    
    // 绘制左母线
    ctx.setStrokeStyle('#607D8B')
    ctx.setLineWidth(2)
    ctx.beginPath()
    ctx.moveTo(leftRailX, networkTop + 10)
    ctx.lineTo(leftRailX, networkTop + 65)
    ctx.stroke()
    
    // 绘制连接线到第一个元件
    const hasPower = plcStore.getNetworkPower(netIndex)
    ctx.beginPath()
    ctx.moveTo(leftRailX, railY)
    ctx.lineTo(leftRailX + 30, railY)
    ctx.stroke()
    
    // 绘制元件
    let currentX = leftRailX + 30
    
    network.elements.forEach((element, elemIndex) => {
      const hasElemPower = plcStore.hasPowerFlow(element.id)
      
      // 绘制元件
      drawMonitorElement(ctx, element, currentX, railY, hasElemPower)
      
      // 绘制连接线
      ctx.beginPath()
      ctx.moveTo(currentX + elementWidth, railY)
      ctx.lineTo(currentX + elementWidth + spacing, railY)
      ctx.stroke()
      
      currentX += elementWidth + spacing
    })
    
    // 绘制右母线
    ctx.beginPath()
    ctx.moveTo(currentX, networkTop + 10)
    ctx.lineTo(currentX, networkTop + 65)
    ctx.stroke()
  })
  
  ctx.draw()
}

// 绘制监控元件
function drawMonitorElement(
  ctx: any, 
  element: any, 
  x: number, 
  y: number, 
  hasPower: boolean
) {
  const width = 60
  const height = 50
  
  // 根据类型选择颜色
  let fillColor = '#fff'
  let strokeColor = '#607D8B'
  
  if (hasPower) {
    fillColor = '#E8F5E9' // 浅绿色背景表示有能流
    strokeColor = '#4CAF50' // 绿色边框
  }
  
  ctx.setFillStyle(fillColor)
  ctx.setStrokeStyle(strokeColor)
  ctx.setLineWidth(2)
  
  switch (element.type) {
    case 'NO':
    case 'NC':
      // 绘制触点
      ctx.beginPath()
      ctx.moveTo(x, y - height / 2 + 15)
      ctx.lineTo(x + 15, y)
      ctx.lineTo(x, y + height / 2 - 15)
      ctx.stroke()
      
      ctx.beginPath()
      ctx.moveTo(x + width, y - height / 2 + 15)
      ctx.lineTo(x + width - 15, y)
      ctx.lineTo(x + width, y + height / 2 - 15)
      ctx.stroke()
      
      // 绘制触点横线
      if (element.type === 'NO') {
        ctx.beginPath()
        ctx.moveTo(x + 15, y)
        ctx.lineTo(x + width - 15, y)
        ctx.stroke()
      } else {
        // NC: 中间有一条斜线
        ctx.beginPath()
        ctx.moveTo(x + 15, y)
        ctx.lineTo(x + width - 15, y)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(x + width - 15, y - 8)
        ctx.lineTo(x + width - 15, y + 8)
        ctx.stroke()
      }
      
      // 绘制地址标签
      ctx.setFillStyle('#37474F')
      ctx.setFontSize(9)
      ctx.fillText(element.address || '', x, y + height / 2 + 12)
      
      // 绘制能流值
      if (hasPower) {
        ctx.setFillStyle('#4CAF50')
        ctx.setFontSize(10)
        ctx.fillText('1', x + width / 2 - 3, y + 4)
      }
      break
      
    case 'COIL':
    case 'SET_COIL':
    case 'RESET_COIL':
      // 绘制线圈
      ctx.beginPath()
      ctx.moveTo(x, y - height / 2 + 15)
      ctx.lineTo(x, y + height / 2 - 15)
      ctx.stroke()
      
      ctx.beginPath()
      ctx.moveTo(x + width, y - height / 2 + 15)
      ctx.lineTo(x + width, y + height / 2 - 15)
      ctx.stroke()
      
      // 绘制括号
      ctx.beginPath()
      ctx.moveTo(x + 5, y - height / 2 + 20)
      ctx.lineTo(x + 5, y + height / 2 - 20)
      ctx.lineTo(x + width - 5, y + height / 2 - 20)
      ctx.lineTo(x + width - 5, y - height / 2 + 20)
      ctx.stroke()
      
      // 特殊标记
      if (element.type === 'SET_COIL') {
        ctx.fillText('S', x + width / 2 - 3, y + 4)
      } else if (element.type === 'RESET_COIL') {
        ctx.fillText('R', x + width / 2 - 3, y + 4)
      }
      
      // 绘制地址标签
      ctx.setFillStyle('#37474F')
      ctx.setFontSize(9)
      ctx.fillText(element.address || '', x, y + height / 2 + 12)
      
      // 获取输出值
      if (element.address) {
        const outValue = plcStore.getBit(element.address)
        ctx.setFillStyle(outValue ? '#4CAF50' : '#607D8B')
        ctx.setFontSize(10)
        ctx.fillText(outValue ? '1' : '0', x + width / 2 - 3, y + 4)
      }
      break
      
    default:
      // 其他类型绘制矩形
      ctx.strokeRect(x + 5, y - height / 2 + 15, width - 10, height - 30)
      ctx.setFillStyle('#37474F')
      ctx.setFontSize(8)
      ctx.fillText(element.type, x + 10, y + 4)
  }
}
</script>

<style scoped lang="scss">
.monitor-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #E8EEF2;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-text {
  font-size: 14px;
  font-weight: bold;
  
  &.running {
    color: #4CAF50;
  }
  &.paused {
    color: #FF9800;
  }
  &.stopped {
    color: #607D8B;
  }
}

.scan-time {
  font-size: 12px;
  color: #607D8B;
}

.scan-count {
  font-size: 12px;
  color: #607D8B;
}

.control-bar {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
}

.control-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: #4CAF50;
  border-radius: 6px;
  color: #fff;
  
  &.stop {
    background: #F44336;
  }
  
  &.reset {
    background: #FF9800;
  }
  
  &.running {
    background: #FF9800;
  }
}

.btn-icon {
  font-size: 16px;
}

.btn-text {
  font-size: 13px;
}

.monitor-canvas-container {
  height: 200px;
  background: #E8EEF2;
}

.monitor-canvas {
  width: 100%;
  height: 100%;
}

.input-panel {
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.panel-title {
  font-size: 14px;
  font-weight: bold;
  color: #37474f;
}

.panel-subtitle {
  font-size: 11px;
  color: #607D8B;
}

.input-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.input-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 6px;
  border: 2px solid transparent;
  
  &.active {
    background: #E8F5E9;
    border-color: #4CAF50;
  }
}

.input-address {
  font-size: 11px;
  color: #607D8B;
}

.input-value {
  font-size: 18px;
  font-weight: bold;
  color: #37474f;
  
  .active & {
    color: #4CAF50;
  }
}

.monitor-table-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  background: #fff;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.table-title {
  font-size: 14px;
  font-weight: bold;
  color: #37474f;
}

.table-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  font-size: 12px;
  color: #00BCD4;
  
  &:active {
    opacity: 0.7;
  }
}

.monitor-table {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.table-row {
  display: flex;
  padding: 10px 0;
  border-bottom: 1px solid #e0e0e0;
  
  &.header {
    font-weight: bold;
    color: #607D8B;
    font-size: 12px;
  }
  
  &.forced {
    background: #FFF3E0;
  }
}

.col-address {
  flex: 1;
  font-size: 13px;
  color: #37474f;
}

.col-value {
  flex: 1;
  font-size: 14px;
  font-weight: bold;
  color: #00BCD4;
  text-align: center;
}

.col-action {
  flex: 1;
  text-align: right;
}

.table-body {
  flex: 1;
  height: 200px;
}

.empty-tip {
  padding: 40px;
  text-align: center;
  color: #607D8B;
  font-size: 13px;
}

// Modal样式
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 300px;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f5f5f5;
}

.modal-title {
  font-size: 16px;
  font-weight: bold;
  color: #37474f;
}

.modal-close {
  font-size: 20px;
  color: #607D8B;
}

.modal-body {
  padding: 16px;
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #e0e0e0;
}

.form-item {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 12px;
  color: #607D8B;
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
}

.picker-value {
  padding: 10px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  background: #fff;
}

.btn-cancel {
  flex: 1;
  padding: 12px;
  text-align: center;
  background: #f5f5f5;
  border-radius: 6px;
  color: #607D8B;
}

.btn-confirm {
  flex: 1;
  padding: 12px;
  text-align: center;
  background: #00BCD4;
  border-radius: 6px;
  color: #fff;
}

.force-info {
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 6px;
}

.force-address {
  display: block;
  font-size: 16px;
  font-weight: bold;
  color: #37474f;
}

.force-current {
  display: block;
  font-size: 12px;
  color: #607D8B;
  margin-top: 4px;
}

.bool-btns {
  display: flex;
  gap: 12px;
}

.bool-btn {
  flex: 1;
  padding: 12px;
  text-align: center;
  background: #f5f5f5;
  border-radius: 6px;
  color: #607D8B;
  
  &.active {
    background: #00BCD4;
    color: #fff;
  }
}
</style>
