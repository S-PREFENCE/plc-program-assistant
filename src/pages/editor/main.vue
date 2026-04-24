<template>
  <view class="editor-container">
    <!-- 顶部工具栏 -->
    <view class="editor-toolbar">
      <view class="toolbar-left">
        <view class="ob-tag">
          <text>OB1</text>
        </view>
        <text class="program-name">{{ currentProject?.name || '未命名' }}</text>
      </view>
      <view class="toolbar-right">
        <view class="tool-btn" @tap="undo" :class="{ disabled: !canUndo }">
          <text>↩</text>
        </view>
        <view class="tool-btn" @tap="redo" :class="{ disabled: !canRedo }">
          <text>↪</text>
        </view>
        <view class="tool-btn zoom-btn" @tap="cycleZoom">
          <text>{{ zoomLevel }}%</text>
        </view>
        <view class="tool-btn" @tap="deleteSelected" :class="{ disabled: !selectedElement }">
          <text>🗑</text>
        </view>
      </view>
    </view>

    <!-- 梯形图画布 -->
    <view class="ladder-canvas-wrapper">
      <canvas
        type="2d"
        id="ladderCanvas"
        class="ladder-canvas"
        :style="{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
      ></canvas>
      
      <!-- 拖拽预览提示 -->
      <view v-if="isDragging" class="drag-indicator" :style="dragIndicatorStyle">
        <text>{{ dragElementType || '移动中...' }}</text>
      </view>
    </view>

    <!-- 网络列表 -->
    <scroll-view class="network-list" scroll-x>
      <view 
        class="network-tab" 
        v-for="(network, index) in networks" 
        :key="network.id"
        :class="{ active: currentNetworkIndex === index }"
        @tap="selectNetwork(index)"
      >
        <text>{{ network.number }}</text>
      </view>
      <view class="network-tab add" @tap="addNetwork">
        <text>+</text>
      </view>
    </scroll-view>

    <!-- 底部指令面板 -->
    <view class="instruction-panel" :class="{ collapsed: isPanelCollapsed }">
      <!-- 面板头部 -->
      <view class="panel-header" @tap="togglePanel">
        <text class="panel-title">{{ isZhCN ? '指令' : 'Instructions' }}</text>
        <text class="panel-toggle">{{ isPanelCollapsed ? '▲' : '▼' }}</text>
      </view>
      
      <!-- 指令分类 -->
      <view class="panel-body" v-show="!isPanelCollapsed">
        <view class="instruction-category">
          <view class="category-title">{{ isZhCN ? '位逻辑' : 'Bit Logic' }}</view>
          <view class="instruction-grid">
            <view 
              class="instruction-item" 
              v-for="inst in bitLogicInstructions"
              :key="inst.type"
              draggable="true"
              @dragstart="onDragStart($event, inst.type)"
              @dragend="onDragEnd"
              @tap="insertElement(inst.type)"
            >
              <text class="inst-symbol">{{ inst.symbol }}</text>
              <text class="inst-name">{{ inst.name }}</text>
            </view>
          </view>
        </view>

        <view class="instruction-category">
          <view class="category-title">{{ isZhCN ? '定时器' : 'Timers' }}</view>
          <view class="instruction-grid">
            <view 
              class="instruction-item" 
              v-for="inst in timerInstructions"
              :key="inst.type"
              @tap="insertElement(inst.type)"
            >
              <text class="inst-symbol">{{ inst.type }}</text>
              <text class="inst-name">{{ inst.name }}</text>
            </view>
          </view>
        </view>

        <view class="instruction-category">
          <view class="category-title">{{ isZhCN ? '计数器' : 'Counters' }}</view>
          <view class="instruction-grid">
            <view 
              class="instruction-item" 
              v-for="inst in counterInstructions"
              :key="inst.type"
              @tap="insertElement(inst.type)"
            >
              <text class="inst-symbol">{{ inst.type }}</text>
              <text class="inst-name">{{ inst.name }}</text>
            </view>
          </view>
        </view>

        <view class="instruction-category">
          <view class="category-title">{{ isZhCN ? '比较' : 'Compare' }}</view>
          <view class="instruction-grid">
            <view 
              class="instruction-item small" 
              v-for="inst in compareInstructions"
              :key="inst.type"
              @tap="insertElement(inst.type)"
            >
              <text class="inst-symbol">{{ inst.symbol }}</text>
            </view>
          </view>
        </view>

        <view class="instruction-category">
          <view class="category-title">{{ isZhCN ? '数学运算' : 'Math' }}</view>
          <view class="instruction-grid">
            <view 
              class="instruction-item" 
              v-for="inst in mathInstructions"
              :key="inst.type"
              @tap="insertElement(inst.type)"
            >
              <text class="inst-symbol">{{ inst.type }}</text>
              <text class="inst-name">{{ inst.symbol }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 属性编辑弹窗 -->
    <view class="modal-mask" v-if="showPropertyModal" @tap="closePropertyModal">
      <view class="property-modal" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">{{ isZhCN ? '元件属性' : 'Element Properties' }}</text>
          <text class="modal-close" @tap="closePropertyModal">×</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">{{ isZhCN ? '地址' : 'Address' }}</text>
            <input 
              class="form-input" 
              v-model="editingAddress" 
              :placeholder="isZhCN ? '如: I0.0' : 'e.g. I0.0'"
            />
          </view>
          <view class="form-item" v-if="showPTField">
            <text class="form-label">PT ({{ isZhCN ? '预设时间' : 'Preset' }}ms)</text>
            <input 
              class="form-input" 
              type="number"
              v-model.number="editingPT" 
              placeholder="1000"
            />
          </view>
          <view class="form-item" v-if="showPVField">
            <text class="form-label">PV ({{ isZhCN ? '预设值' : 'Preset' }})</text>
            <input 
              class="form-input" 
              type="number"
              v-model.number="editingPV" 
              placeholder="10"
            />
          </view>
        </view>
        <view class="modal-footer">
          <button class="btn-secondary" @tap="closePropertyModal">{{ isZhCN ? '取消' : 'Cancel' }}</button>
          <button class="btn-primary" @tap="saveElement">{{ isZhCN ? '确定' : 'OK' }}</button>
        </view>
      </view>
    </view>

    <!-- TabBar占位 -->
    <view class="tab-bar-placeholder"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useProjectStore, type LadderElement, type Network } from '@/store/project'
import { useEditorStore } from '@/store/editor'
import { useSettingsStore } from '@/store/settings'
import { CanvasManager } from '@/utils/CanvasManager'

// Stores
const projectStore = useProjectStore()
const editorStore = useEditorStore()
const settingsStore = useSettingsStore()

// Canvas管理器
let canvasManager: CanvasManager | null = null

// 画布元素
const canvasRef = ref<any>(null)
const canvasWidth = ref(375)
const canvasHeight = ref(500)

// 计算属性
const isZhCN = computed(() => settingsStore.isZhCN)
const currentProject = computed(() => projectStore.currentProject)
const networks = computed(() => editorStore.networks)
const currentNetworkIndex = computed(() => editorStore.currentNetworkIndex)
const currentNetwork = computed(() => editorStore.currentNetwork)
const selectedElement = computed(() => editorStore.selectedElement)

// 编辑器状态
const zoomLevel = computed(() => editorStore.zoomLevel)
const isPanelCollapsed = computed(() => editorStore.isPanelCollapsed)
const canUndo = computed(() => editorStore.canUndo)
const canRedo = computed(() => editorStore.canRedo)
const isDragging = computed(() => editorStore.isDragging)
const dragElementType = computed(() => editorStore.dragElementType)

// 属性编辑
const showPropertyModal = ref(false)
const editingElementId = ref<string | null>(null)
const editingAddress = ref('')
const editingPT = ref(1000)
const editingPV = ref(10)

// 显示字段
const showPTField = computed(() => {
  const elem = selectedElement.value
  return elem && ['TON', 'TOF', 'TP', 'TONR'].includes(elem.type)
})

const showPVField = computed(() => {
  const elem = selectedElement.value
  return elem && ['CTU', 'CTD', 'CTUD'].includes(elem.type)
})

// 拖拽指示器位置
const dragIndicatorStyle = computed(() => ({
  position: 'absolute' as const,
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'rgba(0, 188, 212, 0.9)',
  color: '#fff',
  padding: '8px 16px',
  borderRadius: '8px',
  fontSize: '14px'
}))

// 指令定义
const bitLogicInstructions = [
  { type: 'NO', symbol: '-| |-', name: '常开' },
  { type: 'NC', symbol: '-|/|-', name: '常闭' },
  { type: 'COIL', symbol: '( )', name: '线圈' },
  { type: 'SR', symbol: '(SR)', name: '置位' },
  { type: 'RS', symbol: '(RS)', name: '复位' },
  { type: 'P', symbol: 'P|', name: '上升沿' },
  { type: 'N', symbol: 'N|', name: '下降沿' },
]

const timerInstructions = [
  { type: 'TON', name: '通电延时' },
  { type: 'TOF', name: '断电延时' },
  { type: 'TP', name: '脉冲' },
  { type: 'TONR', name: '保持延时' },
]

const counterInstructions = [
  { type: 'CTU', name: '递增' },
  { type: 'CTD', name: '递减' },
  { type: 'CTUD', name: '增减' },
]

const compareInstructions = [
  { type: 'EQ', symbol: '==' },
  { type: 'NE', symbol: '!=' },
  { type: 'GT', symbol: '>' },
  { type: 'LT', symbol: '<' },
  { type: 'GE', symbol: '>=' },
  { type: 'LE', symbol: '<=' },
]

const mathInstructions = [
  { type: 'ADD', symbol: '+' },
  { type: 'SUB', symbol: '-' },
  { type: 'MUL', symbol: '*' },
  { type: 'DIV', symbol: '/' },
]

// 生命周期
onMounted(() => {
  nextTick(() => {
    initCanvas()
    loadProject()
  })
  
  // 监听键盘事件（用于快捷键）
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeyDown)
  }
})

// 监听网络变化，重新渲染
watch(currentNetworkIndex, () => {
  if (canvasManager) {
    canvasManager.setCurrentNetworkIndex(currentNetworkIndex.value)
  }
})

watch(() => currentNetwork.value?.elements, () => {
  if (canvasManager) {
    canvasManager.render()
  }
}, { deep: true })

// 初始化Canvas
async function initCanvas() {
  const query = uni.createSelectorQuery()
  query.select('#ladderCanvas')
    .fields({ node: true, size: true })
    .exec((res: any[]) => {
      if (res[0] && res[0].node) {
        const node = res[0].node
        const dpr = wx.getWindowInfo?.()?.pixelRatio || uni.getSystemInfoSync?.()?.pixelRatio || 2
        
        canvasWidth.value = res[0].width || 375
        canvasHeight.value = res[0].height || 400
        
        // 创建管理器
        canvasManager = new CanvasManager(node)
        canvasManager.init(canvasWidth.value, canvasHeight.value, dpr)
        
        // 设置网络数据
        if (networks.value.length > 0) {
          canvasManager.setNetworks(networks.value, currentNetworkIndex.value)
        }
        
        // 设置回调
        canvasManager.onElementClick = handleElementClick
        canvasManager.onElementMove = handleElementMove
        canvasManager.onSelectionChange = handleSelectionChange
        
        // 初始渲染
        canvasManager.render()
      }
    })
}

// 加载项目
function loadProject() {
  if (!projectStore.currentProject) {
    projectStore.loadProjects()
    if (projectStore.projects.length > 0) {
      projectStore.loadProject(projectStore.projects[0].id)
    }
  }
}

// 重新渲染画布
function renderCanvas() {
  if (canvasManager && networks.value.length > 0) {
    canvasManager.setNetworks(networks.value, currentNetworkIndex.value)
    canvasManager.render()
  }
}

// 触摸事件处理
function onTouchStart(e: any) {
  if (!canvasManager) return
  
  const touch = e.touches[0]
  if (touch) {
    canvasManager.handlePointerDown(touch.clientX, touch.clientY)
  }
}

function onTouchMove(e: any) {
  if (!canvasManager) return
  
  const touch = e.touches[0]
  if (touch) {
    canvasManager.handlePointerMove(touch.clientX, touch.clientY)
  }
}

function onTouchEnd(e: any) {
  if (!canvasManager) return
  
  const touch = e.changedTouches[0]
  if (touch) {
    canvasManager.handlePointerUp(touch.clientX, touch.clientY)
  }
  
  renderCanvas()
}

// 鼠标事件处理
function onMouseDown(e: any) {
  if (!canvasManager) return
  canvasManager.handlePointerDown(e.clientX, e.clientY)
}

function onMouseMove(e: any) {
  if (!canvasManager) return
  canvasManager.handlePointerMove(e.clientX, e.clientY)
}

function onMouseUp(e: any) {
  if (!canvasManager) return
  canvasManager.handlePointerUp(e.clientX, e.clientY)
  renderCanvas()
}

// 拖拽事件
function onDragStart(e: DragEvent, type: string) {
  if (!e.dataTransfer) return
  
  e.dataTransfer.setData('text/plain', type)
  e.dataTransfer.effectAllowed = 'copy'
  
  editorStore.startDrag('insert', type)
}

function onDragEnd(e: DragEvent) {
  editorStore.endDrag()
}

// 键盘事件
function onKeyDown(e: KeyboardEvent) {
  // Ctrl+Z: 撤销
  if (e.ctrlKey && e.key === 'z') {
    e.preventDefault()
    undo()
  }
  // Ctrl+Y: 重做
  else if (e.ctrlKey && e.key === 'y') {
    e.preventDefault()
    redo()
  }
  // Delete: 删除选中
  else if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectedElement.value && !showPropertyModal.value) {
      e.preventDefault()
      deleteSelected()
    }
  }
  // Escape: 取消选择
  else if (e.key === 'Escape') {
    editorStore.selectElement(null)
    closePropertyModal()
  }
}

// 回调处理
function handleElementClick(element: LadderElement, network: Network) {
  editorStore.selectElement(element.id)
  editingElementId.value = element.id
  editingAddress.value = element.address || ''
  editingPT.value = element.params?.PT || 1000
  editingPV.value = element.params?.PV || 10
  showPropertyModal.value = true
}

function handleElementMove(element: LadderElement, newIndex: number) {
  const oldIndex = editorStore.getElementIndex(element.id)
  if (oldIndex !== -1 && oldIndex !== newIndex) {
    editorStore.moveElement(element.id, oldIndex, newIndex)
  }
}

function handleSelectionChange(element: LadderElement | null) {
  editorStore.selectElement(element?.id || null)
}

// 操作方法
function selectNetwork(index: number) {
  editorStore.selectNetwork(index)
}

function addNetwork() {
  editorStore.addNetwork()
  nextTick(() => renderCanvas())
}

function insertElement(type: string) {
  const element = editorStore.addElement(type)
  editingElementId.value = element.id
  editingAddress.value = element.address || ''
  editingPT.value = element.params?.PT || 1000
  editingPV.value = element.params?.PV || 10
  showPropertyModal.value = true
  
  nextTick(() => renderCanvas())
}

function deleteSelected() {
  if (!selectedElement.value) return
  
  editorStore.deleteElement(selectedElement.value.id)
  nextTick(() => renderCanvas())
}

function undo() {
  editorStore.undo()
  nextTick(() => renderCanvas())
}

function redo() {
  editorStore.redo()
  nextTick(() => renderCanvas())
}

function cycleZoom() {
  const levels = [50, 75, 100, 125, 150, 200]
  const currentIndex = levels.indexOf(zoomLevel.value)
  editorStore.setZoom(levels[(currentIndex + 1) % levels.length])
}

function togglePanel() {
  editorStore.togglePanel()
}

// 属性编辑
function closePropertyModal() {
  showPropertyModal.value = false
  editingElementId.value = null
}

function saveElement() {
  if (!editingElementId.value) return
  
  const updates: Partial<LadderElement> = {
    address: editingAddress.value
  }
  
  if (showPTField.value) {
    updates.params = { PT: editingPT.value }
  }
  
  if (showPVField.value) {
    updates.params = { ...updates.params, PV: editingPV.value }
  }
  
  editorStore.updateElement(editingElementId.value, updates)
  closePropertyModal()
  nextTick(() => renderCanvas())
}
</script>

<style lang="scss" scoped>
@import '@/styles/common.scss';

.editor-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: $bg-page;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-sm $spacing-md;
  background: $bg-card;
  border-bottom: 1rpx solid $border-color;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.ob-tag {
  padding: 4rpx $spacing-sm;
  background: $primary-color;
  color: $text-white;
  font-size: $font-xs;
  font-weight: 600;
  border-radius: $radius-sm;
}

.program-name {
  font-size: $font-sm;
  color: $text-secondary;
  max-width: 200rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
}

.tool-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $bg-input;
  border-radius: $radius-sm;
  font-size: $font-sm;
  color: $text-primary;
  
  &.disabled {
    opacity: 0.4;
  }
  
  &:active:not(.disabled) {
    background: $border-color;
  }
}

.zoom-btn {
  min-width: 80rpx;
  font-size: $font-xs;
}

.ladder-canvas-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: $bg-card;
}

.ladder-canvas {
  width: 100%;
  height: 100%;
  touch-action: none;
}

.drag-indicator {
  pointer-events: none;
  z-index: 100;
}

.network-list {
  display: flex;
  padding: $spacing-sm $spacing-md;
  background: $bg-card;
  border-top: 1rpx solid $border-color;
  white-space: nowrap;
  flex-shrink: 0;
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
  
  &.add {
    color: $primary-color;
    font-weight: 600;
  }
  
  &:active {
    opacity: 0.7;
  }
}

.instruction-panel {
  background: $bg-card;
  border-top: 1rpx solid $border-color;
  max-height: 50vh;
  transition: max-height 0.3s ease;
  flex-shrink: 0;
  
  &.collapsed {
    max-height: 80rpx;
  }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-sm $spacing-md;
  background: $bg-panel;
}

.panel-title {
  font-size: $font-md;
  font-weight: 600;
  color: $text-primary;
}

.panel-toggle {
  color: $text-secondary;
  font-size: $font-sm;
}

.panel-body {
  padding: $spacing-md;
  max-height: calc(50vh - 80rpx);
  overflow-y: auto;
}

.instruction-category {
  margin-bottom: $spacing-md;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.category-title {
  font-size: $font-sm;
  font-weight: 600;
  color: $text-secondary;
  margin-bottom: $spacing-sm;
}

.instruction-grid {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
}

.instruction-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 120rpx;
  height: 100rpx;
  background: $bg-input;
  border-radius: $radius-sm;
  border: 1rpx solid $border-color;
  cursor: grab;
  
  &:active {
    cursor: grabbing;
    background: rgba($primary-color, 0.1);
    border-color: $primary-color;
  }
  
  &.small {
    width: 80rpx;
    height: 80rpx;
  }
}

.inst-symbol {
  font-size: $font-md;
  font-weight: 600;
  color: $text-primary;
  font-family: monospace;
}

.inst-name {
  font-size: $font-xs;
  color: $text-secondary;
  margin-top: 4rpx;
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

.property-modal {
  width: 100%;
  max-width: 600rpx;
  background: $bg-card;
  border-radius: $radius-lg $radius-lg 0 0;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-md;
  border-bottom: 1rpx solid $border-color;
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
}

.form-item {
  margin-bottom: $spacing-md;
  
  &:last-child {
    margin-bottom: 0;
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
}

.modal-footer {
  display: flex;
  gap: $spacing-md;
  padding: $spacing-md;
  border-top: 1rpx solid $border-color;
}

.btn-primary, .btn-secondary {
  flex: 1;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-sm;
  font-size: $font-md;
  text-align: center;
}

.btn-primary {
  background: $primary-color;
  color: $text-white;
}

.btn-secondary {
  background: $bg-input;
  color: $text-primary;
}

.tab-bar-placeholder {
  height: 100rpx;
}
</style>
