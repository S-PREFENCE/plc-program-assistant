/**
 * 编辑器Store - 管理梯形图编辑器状态
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Network, LadderElement } from './project'
import { useProjectStore } from './project'
import { 
  CommandHistory, 
  createAddElementCommand, 
  createDeleteElementCommand,
  createMoveElementCommand,
  createUpdateElementCommand,
  createReorderElementsCommand,
  createBatchCommand,
  type Command
} from '../utils/CommandHistory'

// 编辑器状态
export const useEditorStore = defineStore('editor', () => {
  const projectStore = useProjectStore()
  
  // 命令历史
  const history = new CommandHistory()
  
  // 状态
  const canUndo = ref(false)
  const canRedo = ref(false)
  const currentNetworkIndex = ref(0)
  const selectedElementId = ref<string | null>(null)
  const zoomLevel = ref(100)
  const isPanelCollapsed = ref(false)
  const isDragging = ref(false)
  const dragType = ref<'insert' | 'move' | null>(null)
  const dragElementType = ref<string | null>(null)
  
  // 监听历史变化
  history.onHistoryChange = (undo, redo) => {
    canUndo.value = undo
    canRedo.value = redo
  }
  
  // 计算属性
  const currentNetwork = computed(() => {
    const block = projectStore.currentBlock
    if (!block || !block.networks.length) return null
    return block.networks[currentNetworkIndex.value] || null
  })
  
  const networks = computed(() => {
    const block = projectStore.currentBlock
    return block?.networks || []
  })
  
  const selectedElement = computed(() => {
    if (!selectedElementId.value || !currentNetwork.value) return null
    return currentNetwork.value.elements.find(e => e.id === selectedElementId.value) || null
  })
  
  // 方法
  function selectNetwork(index: number) {
    if (index >= 0 && index < networks.value.length) {
      currentNetworkIndex.value = index
      selectedElementId.value = null
    }
  }
  
  function selectElement(elementId: string | null) {
    selectedElementId.value = elementId
  }
  
  function addNetwork() {
    projectStore.addNetwork()
    currentNetworkIndex.value = networks.value.length - 1
  }
  
  function deleteNetwork(index: number) {
    if (networks.value.length <= 1) return // 至少保留一个网络
    if (index < 0 || index >= networks.value.length) return
    
    const network = networks.value[index]
    
    // TODO: 添加删除网络的命令
    projectStore.currentBlock?.networks.splice(index, 1)
    
    // 调整当前网络索引
    if (currentNetworkIndex.value >= networks.value.length) {
      currentNetworkIndex.value = networks.value.length - 1
    }
    
    selectedElementId.value = null
  }
  
  function addElement(type: string, index?: number): LadderElement {
    if (!currentNetwork.value) throw new Error('No current network')
    
    const network = currentNetwork.value
    const insertIndex = index ?? network.elements.length
    
    // 创建元件
    const element: LadderElement = {
      id: 'elem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      type,
      address: '',
      symbol: '',
      x: 0,
      y: 0,
      width: 120,
      height: 60,
      params: {}
    }
    
    // 设置默认值
    if (['TON', 'TOF', 'TP', 'TONR'].includes(type)) {
      element.params.PT = 1000
    }
    if (['CTU', 'CTD', 'CTUD'].includes(type)) {
      element.params.PV = 10
    }
    
    // 创建命令
    const command = createAddElementCommand(network, element, insertIndex)
    
    // 执行并记录
    history.execute(command)
    projectStore.saveProject()
    
    return element
  }
  
  function deleteElement(elementId: string) {
    if (!currentNetwork.value) return
    
    const network = currentNetwork.value
    const index = network.elements.findIndex(e => e.id === elementId)
    if (index === -1) return
    
    const element = network.elements[index]
    
    // 创建命令
    const command = createDeleteElementCommand(network, element, index)
    
    // 执行并记录
    history.execute(command)
    projectStore.saveProject()
    
    if (selectedElementId.value === elementId) {
      selectedElementId.value = null
    }
  }
  
  function moveElement(elementId: string, fromIndex: number, toIndex: number) {
    if (!currentNetwork.value) return
    if (fromIndex === toIndex) return
    
    const network = currentNetwork.value
    
    // 创建命令
    const command = createMoveElementCommand(network, elementId, fromIndex, toIndex)
    
    // 执行并记录
    history.execute(command)
    projectStore.saveProject()
  }
  
  function updateElement(elementId: string, updates: Partial<LadderElement>) {
    if (!currentNetwork.value) return
    
    const network = currentNetwork.value
    
    // 创建命令
    const command = createUpdateElementCommand(network, elementId, updates)
    
    // 执行并记录
    history.execute(command)
    projectStore.saveProject()
  }
  
  function reorderElements(fromIndices: number[], toIndices: number[]) {
    if (!currentNetwork.value) return
    
    const network = currentNetwork.value
    
    // 创建命令
    const command = createReorderElementsCommand(network, fromIndices, toIndices)
    
    // 执行并记录
    history.execute(command)
    projectStore.saveProject()
  }
  
  function batchExecute(commands: Command[], description?: string) {
    const batchCommand = createBatchCommand(commands, description)
    history.execute(batchCommand)
    projectStore.saveProject()
  }
  
  function undo() {
    if (history.canUndo()) {
      history.undo()
      projectStore.saveProject()
    }
  }
  
  function redo() {
    if (history.canRedo()) {
      history.redo()
      projectStore.saveProject()
    }
  }
  
  function setZoom(level: number) {
    zoomLevel.value = Math.max(50, Math.min(200, level))
  }
  
  function togglePanel() {
    isPanelCollapsed.value = !isPanelCollapsed.value
  }
  
  function startDrag(type: 'insert' | 'move', elementType?: string) {
    isDragging.value = true
    dragType.value = type
    dragElementType.value = elementType || null
  }
  
  function endDrag() {
    isDragging.value = false
    dragType.value = null
    dragElementType.value = null
  }
  
  function getElementIndex(elementId: string): number {
    if (!currentNetwork.value) return -1
    return currentNetwork.value.elements.findIndex(e => e.id === elementId)
  }
  
  // 获取当前元件数量
  function getElementCount(): number {
    return currentNetwork.value?.elements.length || 0
  }
  
  // 复制元件
  function copyElement(elementId: string): LadderElement | null {
    if (!currentNetwork.value) return null
    
    const element = currentNetwork.value.elements.find(e => e.id === elementId)
    if (!element) return null
    
    return { ...element }
  }
  
  // 粘贴元件
  function pasteElement(element: LadderElement): LadderElement {
    if (!currentNetwork.value) throw new Error('No current network')
    
    const newElement: LadderElement = {
      ...element,
      id: 'elem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    }
    
    const command = createAddElementCommand(
      currentNetwork.value,
      newElement,
      currentNetwork.value.elements.length
    )
    
    history.execute(command)
    projectStore.saveProject()
    
    return newElement
  }
  
  return {
    // 状态
    canUndo,
    canRedo,
    currentNetworkIndex,
    selectedElementId,
    zoomLevel,
    isPanelCollapsed,
    isDragging,
    dragType,
    dragElementType,
    
    // 计算属性
    currentNetwork,
    networks,
    selectedElement,
    
    // 方法
    selectNetwork,
    selectElement,
    addNetwork,
    deleteNetwork,
    addElement,
    deleteElement,
    moveElement,
    updateElement,
    reorderElements,
    batchExecute,
    undo,
    redo,
    setZoom,
    togglePanel,
    startDrag,
    endDrag,
    getElementIndex,
    getElementCount,
    copyElement,
    pasteElement,
    history
  }
})
