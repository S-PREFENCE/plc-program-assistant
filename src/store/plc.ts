/**
 * PLC状态管理
 * 管理仿真引擎状态、运行控制和监控数据
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  PLCEngine, 
  PLCState, 
  MemoryArea, 
  TimerState, 
  CounterState,
  Variable 
} from '../engine/PLCEngine'
import { useProjectStore } from './project'

// 监控项接口
export interface MonitorItem {
  id: string
  address: string
  value: any
  dataType: string
  forced: boolean
  displayFormat: 'bin' | 'dec' | 'hex' | 'real'
}

// PLC Store
export const usePLCStore = defineStore('plc', () => {
  // 引擎实例
  const engine = new PLCEngine()
  
  // 运行状态
  const state = ref<PLCState>(PLCState.Stopped)
  
  // 扫描设置
  const scanTime = ref(20)  // ms
  
  // 扫描统计
  const scanStats = ref({
    scanCount: 0,
    lastScanTime: 0,
    averageScanTime: 0,
    maxScanTime: 0
  })
  
  // 监控项列表
  const monitorItems = ref<MonitorItem[]>([])
  
  // 网络执行状态（用于能流高亮）
  const networkPower = ref<Map<number, boolean>>(new Map())
  
  // 元件执行结果（用于实时值显示）
  const elementValues = ref<Map<string, boolean | number>>(new Map())
  
  // 能流路径（用于动画）
  const powerFlowPaths = ref<Map<string, boolean>>(new Map())
  
  // 定时器状态
  const timerStates = ref<Map<string, TimerState>>(new Map())
  
  // 计数器状态
  const counterStates = ref<Map<string, CounterState>>(new Map())
  
  // 计算属性
  const isRunning = computed(() => state.value === PLCState.Running)
  const isPaused = computed(() => state.value === PLCState.Paused)
  const isStopped = computed(() => state.value === PLCState.Stopped)
  
  // 初始化
  function init() {
    // 设置扫描完成回调
    engine.setOnScanComplete((stats) => {
      scanStats.value = { ...stats }
    })
    
    // 设置网络执行回调
    engine.setOnNetworkExecuted((networkIndex, hasPower) => {
      networkPower.value.set(networkIndex, hasPower)
    })
    
    // 设置元件执行回调
    engine.setOnElementExecuted((element, value) => {
      elementValues.value.set(element.id, value)
      powerFlowPaths.value.set(element.id, value as boolean)
    })
    
    // 从项目加载程序
    const projectStore = useProjectStore()
    if (projectStore.currentProgram) {
      engine.program = projectStore.currentProgram
    }
    
    if (projectStore.variables) {
      engine.variables = projectStore.variables
    }
    
    // 设置扫描时间
    engine.scanTime = scanTime.value
  }
  
  // 启动
  function start() {
    const projectStore = useProjectStore()
    if (projectStore.currentProgram) {
      engine.program = projectStore.currentProgram
    }
    if (projectStore.variables) {
      engine.variables = projectStore.variables
    }
    
    engine.scanTime = scanTime.value
    engine.start()
    state.value = PLCState.Running
  }
  
  // 停止
  function stop() {
    engine.stop()
    state.value = PLCState.Stopped
  }
  
  // 暂停
  function pause() {
    engine.pause()
    state.value = PLCState.Paused
  }
  
  // 复位
  function reset() {
    engine.reset()
    state.value = PLCState.Stopped
    networkPower.value.clear()
    elementValues.value.clear()
    powerFlowPaths.value.clear()
    timerStates.value.clear()
    counterStates.value.clear()
  }
  
  // 切换运行/暂停
  function toggleRunPause() {
    if (isRunning.value) {
      pause()
    } else if (isStopped.value) {
      start()
    } else if (isPaused.value) {
      start()
    }
  }
  
  // 设置输入（模拟外部输入）
  function setInput(address: string, value: boolean) {
    engine.setInput(address, value)
  }
  
  // 读取位值
  function getBit(address: string): boolean {
    return engine.getBit(address)
  }
  
  // 写入位值
  function setBit(address: string, value: boolean) {
    engine.setBit(address, value)
  }
  
  // 读取字节
  function getByte(area: MemoryArea, byte: number): number {
    return engine.getByte(area, byte)
  }
  
  // 写入字节
  function setByte(area: MemoryArea, byte: number, value: number) {
    engine.setByte(area, byte, value)
  }
  
  // 读取字
  function getWord(area: MemoryArea, word: number): number {
    return engine.getWord(area, word)
  }
  
  // 写入字
  function setWord(area: MemoryArea, word: number, value: number) {
    engine.setWord(area, word, value)
  }
  
  // 读取双字
  function getDWord(area: MemoryArea, dword: number): number {
    return engine.getDWord(area, dword)
  }
  
  // 写入双字
  function setDWord(area: MemoryArea, dword: number, value: number) {
    engine.setDWord(area, dword, value)
  }
  
  // 获取网络能流状态
  function getNetworkPower(index: number): boolean {
    return networkPower.value.get(index) || false
  }
  
  // 获取元件值
  function getElementValue(elementId: string): boolean | number | undefined {
    return elementValues.value.get(elementId)
  }
  
  // 判断元件是否有能流
  function hasPowerFlow(elementId: string): boolean {
    return powerFlowPaths.value.get(elementId) || false
  }
  
  // 添加监控项
  function addMonitorItem(address: string, dataType: string = 'BOOL', displayFormat: 'bin' | 'dec' | 'hex' | 'real' = 'dec') {
    // 检查是否已存在
    const exists = monitorItems.value.some(item => item.address === address)
    if (exists) return
    
    monitorItems.value.push({
      id: `m_${Date.now()}`,
      address,
      value: null,
      dataType,
      forced: false,
      displayFormat
    })
  }
  
  // 移除监控项
  function removeMonitorItem(id: string) {
    const index = monitorItems.value.findIndex(item => item.id === id)
    if (index !== -1) {
      monitorItems.value.splice(index, 1)
    }
  }
  
  // 清除所有监控项
  function clearMonitorItems() {
    monitorItems.value = []
  }
  
  // 更新监控值
  function updateMonitorValues() {
    monitorItems.value.forEach(item => {
      try {
        switch (item.dataType) {
          case 'BOOL':
            item.value = engine.getBit(item.address)
            break
          case 'BYTE':
            item.value = engine.getByte(MemoryArea.BitMemory, parseInt(item.address.replace(/[IQMD]/, '')))
            break
          case 'WORD':
          case 'INT':
            item.value = engine.getWord(MemoryArea.BitMemory, parseInt(item.address.replace(/[IQMD]W/, '')))
            break
          case 'DWORD':
          case 'DINT':
          case 'REAL':
            item.value = engine.getDWord(MemoryArea.BitMemory, parseInt(item.address.replace(/[IQMD]D/, '')))
            break
        }
      } catch {
        item.value = null
      }
    })
  }
  
  // 强制值
  function forceValue(address: string, value: any) {
    try {
      if (typeof value === 'boolean') {
        engine.forceBit(address, value)
      } else if (typeof value === 'number') {
        const area = getAreaFromAddress(address)
        const offset = getOffsetFromAddress(address)
        if (area && offset !== null) {
          engine.forceByte(area, offset, value)
        }
      }
      
      // 更新监控项的forced状态
      const item = monitorItems.value.find(i => i.address === address)
      if (item) {
        item.forced = true
      }
    } catch {
      // 操作失败
    }
  }
  
  // 取消强制
  function unforceValue(address: string) {
    try {
      engine.unforceBit(address)
      
      const item = monitorItems.value.find(i => i.address === address)
      if (item) {
        item.forced = false
      }
    } catch {
      // 操作失败
    }
  }
  
  // 获取定时器状态
  function getTimerState(timerId: string): TimerState | undefined {
    return engine.timers.get(timerId)
  }
  
  // 获取计数器状态
  function getCounterState(counterId: string): CounterState | undefined {
    return engine.counters.get(counterId)
  }
  
  // 更新定时器/计数器状态
  function updateTimerCounterStates() {
    timerStates.value = new Map(engine.timers)
    counterStates.value = new Map(engine.counters)
  }
  
  // 辅助函数：从地址获取内存区域
  function getAreaFromAddress(address: string): MemoryArea | null {
    if (address.startsWith('I')) return MemoryArea.Input
    if (address.startsWith('Q')) return MemoryArea.Output
    if (address.startsWith('M')) return MemoryArea.BitMemory
    if (address.startsWith('DB')) return MemoryArea.DataBlock
    return null
  }
  
  // 辅助函数：从地址获取偏移量
  function getOffsetFromAddress(address: string): number | null {
    const match = address.match(/[IQMD](\d+)/)
    if (match) return parseInt(match[1])
    return null
  }
  
  // 格式化显示值
  function formatValue(value: any, format: 'bin' | 'dec' | 'hex' | 'real'): string {
    if (value === null || value === undefined) return '--'
    
    if (typeof value === 'boolean') {
      return value ? '1' : '0'
    }
    
    if (typeof value === 'number') {
      switch (format) {
        case 'bin':
          return value.toString(2).padStart(8, '0')
        case 'hex':
          return '0x' + value.toString(16).toUpperCase()
        case 'real':
          return value.toFixed(2)
        case 'dec':
        default:
          return value.toString()
      }
    }
    
    return String(value)
  }
  
  return {
    // 状态
    state,
    scanTime,
    scanStats,
    monitorItems,
    networkPower,
    elementValues,
    powerFlowPaths,
    timerStates,
    counterStates,
    
    // 计算属性
    isRunning,
    isPaused,
    isStopped,
    
    // 方法
    init,
    start,
    stop,
    pause,
    reset,
    toggleRunPause,
    setInput,
    getBit,
    setBit,
    getByte,
    setByte,
    getWord,
    setWord,
    getDWord,
    setDWord,
    getNetworkPower,
    getElementValue,
    hasPowerFlow,
    addMonitorItem,
    removeMonitorItem,
    clearMonitorItems,
    updateMonitorValues,
    forceValue,
    unforceValue,
    getTimerState,
    getCounterState,
    updateTimerCounterStates,
    formatValue
  }
})
