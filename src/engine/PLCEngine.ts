/**
 * PLC仿真引擎核心
 * 实现虚拟PLC的内存管理、指令执行和扫描调度
 */

import { LadderElement, Network, Program } from '../store/project'
import { BitLogicExecutor } from './instructions/BitLogic'
import { TimerExecutor, TimerState } from './instructions/Timer'
import { CounterExecutor, CounterState } from './instructions/Counter'
import { CompareExecutor } from './instructions/Compare'
import { MathExecutor } from './instructions/Math'

/**
 * 内存区域类型
 */
export enum MemoryArea {
  Input = 'I',      // 输入区
  Output = 'Q',    // 输出区
  BitMemory = 'M',  // 位存储区
  DataBlock = 'DB' // 数据块
}

/**
 * 数据类型
 */
export enum DataType {
  Bool = 'BOOL',
  Byte = 'BYTE',
  Word = 'WORD',
  DWord = 'DWORD',
  Int = 'INT',
  DInt = 'DINT',
  Real = 'REAL'
}

/**
 * PLC运行状态
 */
export enum PLCState {
  Stopped = 'STOPPED',
  Running = 'RUNNING',
  Paused = 'PAUSED'
}

/**
 * 变量定义接口
 */
export interface Variable {
  id: string
  symbol: string
  address: string
  dataType: DataType
  comment: string
  retain: boolean
  initialValue?: any
}

/**
 * 扫描统计信息
 */
export interface ScanStats {
  scanCount: number
  lastScanTime: number  // ms
  averageScanTime: number
  maxScanTime: number
}

/**
 * PLC仿真引擎
 * 负责内存管理、程序扫描和指令执行
 */
export class PLCEngine {
  // 运行状态
  private _state: PLCState = PLCState.Stopped
  public get state(): PLCState { return this._state }
  
  // 扫描控制
  private _isRunning: boolean = false
  private _scanInterval: number | null = null
  private _scanTime: number = 20  // ms
  public get scanTime(): number { return this._scanTime }
  public set scanTime(value: number) { this._scanTime = value }
  
  // 内存区 (使用Map模拟字节寻址)
  private _inputs: Map<number, number> = new Map()   // I区
  private _outputs: Map<number, number> = new Map()  // Q区
  private _memory: Map<number, number> = new Map()   // M区
  private _dataBlocks: Map<string, Map<number, number>> = new Map()  // DB区
  
  // 定时器状态
  timers: Map<string, TimerState> = new Map()
  
  // 计数器状态
  counters: Map<string, CounterState> = new Map()
  
  // 扫描统计
  private _scanStats: ScanStats = {
    scanCount: 0,
    lastScanTime: 0,
    averageScanTime: 0,
    maxScanTime: 0
  }
  public get scanStats(): ScanStats { return { ...this._scanStats } }
  
  // 程序数据
  private _program: Program | null = null
  public get program(): Program | null { return this._program }
  public set program(value: Program | null) { this._program = value }
  
  // 变量表
  private _variables: Variable[] = []
  public get variables(): Variable[] { return [...this._variables] }
  public set variables(value: Variable[]) { this._variables = value }
  
  // 执行器
  private bitLogic: BitLogicExecutor
  private timerExecutor: TimerExecutor
  private counterExecutor: CounterExecutor
  private compareExecutor: CompareExecutor
  private mathExecutor: MathExecutor
  
  // 扫描回调
  private onScanComplete?: (stats: ScanStats) => void
  private onNetworkExecuted?: (networkIndex: number, hasPower: boolean) => void
  private onElementExecuted?: (element: LadderElement, value: boolean | number) => void
  
  constructor() {
    this.bitLogic = new BitLogicExecutor(this)
    this.timerExecutor = new TimerExecutor(this)
    this.counterExecutor = new CounterExecutor(this)
    this.compareExecutor = new CompareExecutor()
    this.mathExecutor = new MathExecutor()
  }
  
  // ==================== 公共接口 ====================
  
  /**
   * 设置扫描完成回调
   */
  setOnScanComplete(callback: (stats: ScanStats) => void) {
    this.onScanComplete = callback
  }
  
  /**
   * 设置网络执行完成回调
   */
  setOnNetworkExecuted(callback: (networkIndex: number, hasPower: boolean) => void) {
    this.onNetworkExecuted = callback
  }
  
  /**
   * 设置元件执行回调
   */
  setOnElementExecuted(callback: (element: LadderElement, value: boolean | number) => void) {
    this.onElementExecuted = callback
  }
  
  /**
   * 启动PLC运行
   */
  start() {
    if (this._isRunning) return
    
    this._isRunning = true
    this._state = PLCState.Running
    this._scanInterval = setInterval(() => this.scan(), this._scanTime) as any
  }
  
  /**
   * 停止PLC运行
   */
  stop() {
    this._isRunning = false
    this._state = PLCState.Stopped
    
    if (this._scanInterval !== null) {
      clearInterval(this._scanInterval)
      this._scanInterval = null
    }
  }
  
  /**
   * 暂停PLC运行
   */
  pause() {
    if (!this._isRunning) return
    
    this._isRunning = false
    this._state = PLCState.Paused
    
    if (this._scanInterval !== null) {
      clearInterval(this._scanInterval)
      this._scanInterval = null
    }
  }
  
  /**
   * 复位PLC（清空所有内存）
   */
  reset() {
    this.stop()
    this._inputs.clear()
    this._outputs.clear()
    this._memory.clear()
    this.timers.clear()
    this.counters.clear()
    this._scanStats = {
      scanCount: 0,
      lastScanTime: 0,
      averageScanTime: 0,
      maxScanTime: 0
    }
  }
  
  /**
   * 执行一次完整扫描
   */
  scan(): void {
    if (!this._program || !this._isRunning) return
    
    const startTime = performance.now()
    
    // 遍历执行所有网络
    const networks = this._program.ob1 || []
    networks.forEach((network, index) => {
      const hasPower = this.executeNetwork(network)
      this.onNetworkExecuted?.(index, hasPower)
    })
    
    // 更新扫描统计
    const scanTime = performance.now() - startTime
    this._scanStats.lastScanTime = scanTime
    this._scanStats.scanCount++
    this._scanStats.averageScanTime = 
      (this._scanStats.averageScanTime * (this._scanStats.scanCount - 1) + scanTime) / this._scanStats.scanCount
    this._scanStats.maxScanTime = Math.max(this._scanStats.maxScanTime, scanTime)
    
    this.onScanComplete?.(this.scanStats)
  }
  
  /**
   * 执行单个网络
   */
  executeNetwork(network: Network): boolean {
    // 计算网络是否能流从左向右
    let hasPower = true  // 左母线始终有能流
    
    for (const element of network.elements) {
      hasPower = this.executeElement(element, hasPower)
      this.onElementExecuted?.(element, hasPower)
      
      // 如果遇到分支结束或线圈，后续元件不受影响
      if (element.type === 'COIL' || element.type === 'SET_COIL' || element.type === 'RESET_COIL') {
        hasPower = true  // 线圈执行后，能流继续（对于下一个元件）
      }
    }
    
    return hasPower
  }
  
  /**
   * 执行单个指令
   */
  executeElement(element: LadderElement, inputPower: boolean): boolean {
    switch (element.type) {
      // 位逻辑指令
      case 'NO':
      case 'NC':
      case 'COIL':
      case 'SET_COIL':
      case 'RESET_COIL':
      case 'SR':
      case 'RS':
      case 'POSITIVE_EDGE':
      case 'NEGATIVE_EDGE':
        return this.bitLogic.execute(element, inputPower)
      
      // 定时器指令
      case 'TON':
      case 'TOF':
      case 'TP':
      case 'TONR':
        return this.timerExecutor.execute(element, inputPower)
      
      // 计数器指令
      case 'CTU':
      case 'CTD':
      case 'CTUD':
        return this.counterExecutor.execute(element, inputPower)
      
      // 比较指令
      case 'COMPARE_EQUAL':
      case 'COMPARE_NOT_EQUAL':
      case 'COMPARE_GREATER':
      case 'COMPARE_LESS':
      case 'COMPARE_GREATER_EQUAL':
      case 'COMPARE_LESS_EQUAL':
        return this.compareExecutor.execute(element, inputPower)
      
      // 数学运算
      case 'ADD':
      case 'SUB':
      case 'MUL':
      case 'DIV':
        return this.mathExecutor.execute(element, inputPower)
      
      default:
        return inputPower
    }
  }
  
  // ==================== 内存读写接口 ====================
  
  /**
   * 读取位值 (如 I0.0, Q0.1, M10.0)
   */
  getBit(address: string): boolean {
    const { area, byte, bit } = this.parseAddress(address)
    const byteValue = this.getByte(area, byte)
    return (byteValue & (1 << bit)) !== 0
  }
  
  /**
   * 写入位值
   */
  setBit(address: string, value: boolean): void {
    const { area, byte, bit } = this.parseAddress(address)
    let byteValue = this.getByte(area, byte)
    
    if (value) {
      byteValue |= (1 << bit)
    } else {
      byteValue &= ~(1 << bit)
    }
    
    this.setByte(area, byte, byteValue)
  }
  
  /**
   * 读取字节值 (如 IB0, QB0, MB0)
   */
  getByte(area: MemoryArea, byteAddr: number): number {
    const map = this.getMemoryMap(area)
    return map.get(byteAddr) || 0
  }
  
  /**
   * 写入字节值
   */
  setByte(area: MemoryArea, byteAddr: number, value: number): void {
    const map = this.getMemoryMap(area)
    map.set(byteAddr, value & 0xFF)
  }
  
  /**
   * 读取字值 (如 IW0, QW0, MW0)
   */
  getWord(area: MemoryArea, wordAddr: number): number {
    const low = this.getByte(area, wordAddr)
    const high = this.getByte(area, wordAddr + 1)
    return low | (high << 8)
  }
  
  /**
   * 写入字值
   */
  setWord(area: MemoryArea, wordAddr: number, value: number): void {
    this.setByte(area, wordAddr, value & 0xFF)
    this.setByte(area, wordAddr + 1, (value >> 8) & 0xFF)
  }
  
  /**
   * 读取双字值 (如 ID0, QD0, MD0)
   */
  getDWord(area: MemoryArea, dwordAddr: number): number {
    const w0 = this.getWord(area, dwordAddr)
    const w1 = this.getWord(area, dwordAddr + 2)
    return w0 | (w1 << 16)
  }
  
  /**
   * 写入双字值
   */
  setDWord(area: MemoryArea, dwordAddr: number, value: number): void {
    this.setWord(area, dwordAddr, value & 0xFFFF)
    this.setWord(area, dwordAddr + 2, (value >> 16) & 0xFFFF)
  }
  
  /**
   * 读取INT值 (16位有符号)
   */
  getInt(area: MemoryArea, wordAddr: number): number {
    const value = this.getWord(area, wordAddr)
    // 转换为有符号数
    return value >= 0x8000 ? value - 0x10000 : value
  }
  
  /**
   * 写入INT值
   */
  setInt(area: MemoryArea, wordAddr: number, value: number): void {
    // 限制在INT范围内
    const clamped = Math.max(-32768, Math.min(32767, value))
    this.setWord(area, wordAddr, clamped & 0xFFFF)
  }
  
  /**
   * 读取DINT值 (32位有符号)
   */
  getDInt(area: MemoryArea, dwordAddr: number): number {
    const value = this.getDWord(area, dwordAddr)
    return value >= 0x80000000 ? value - 0x100000000 : value
  }
  
  /**
   * 写入DINT值
   */
  setDInt(area: MemoryArea, dwordAddr: number, value: number): void {
    const clamped = Math.max(-2147483648, Math.min(2147483647, value))
    this.setDWord(area, dwordAddr, clamped >>> 0)
  }
  
  /**
   * 读取REAL值 (32位浮点)
   */
  getReal(area: MemoryArea, dwordAddr: number): number {
    const bits = this.getDWord(area, dwordAddr)
    // IEEE 754 单精度浮点
    const sign = (bits >> 31) & 1
    const exp = (bits >> 23) & 0xFF
    const mantissa = bits & 0x7FFFFF
    
    if (exp === 0) return 0
    if (exp === 0xFF) return mantissa ? NaN : (sign ? -Infinity : Infinity)
    
    const value = (1 + mantissa / 0x800000) * Math.pow(2, exp - 127)
    return sign ? -value : value
  }
  
  /**
   * 写入REAL值
   */
  setReal(area: MemoryArea, dwordAddr: number, value: number): void {
    // IEEE 754 单精度浮点转换
    const buffer = new ArrayBuffer(4)
    const view = new DataView(buffer)
    view.setFloat32(0, value)
    const bits = view.getUint32(0)
    this.setDWord(area, dwordAddr, bits)
  }
  
  /**
   * 获取地址的字节和位
   */
  parseAddress(address: string): { area: MemoryArea; byte: number; bit: number } {
    const match = address.match(/^([IQMD])(\d+)\.(\d+)$/)
    if (!match) {
      throw new Error(`无效的地址格式: ${address}`)
    }
    
    const area = match[1] as MemoryArea
    const byte = parseInt(match[2])
    const bit = parseInt(match[3])
    
    if (bit < 0 || bit > 7) {
      throw new Error(`位地址必须在0-7之间: ${address}`)
    }
    
    return { area, byte, bit }
  }
  
  /**
   * 获取指定内存区域的Map
   */
  private getMemoryMap(area: MemoryArea): Map<number, number> {
    switch (area) {
      case MemoryArea.Input: return this._inputs
      case MemoryArea.Output: return this._outputs
      case MemoryArea.BitMemory: return this._memory
      case MemoryArea.DataBlock:
        // 默认使用DB1
        if (!this._dataBlocks.has('DB1')) {
          this._dataBlocks.set('DB1', new Map())
        }
        return this._dataBlocks.get('DB1')!
      default:
        throw new Error(`未知的内存区域: ${area}`)
    }
  }
  
  // ==================== 强制功能 ====================
  
  /**
   * 强制设置位值
   */
  forceBit(address: string, value: boolean): void {
    this.setBit(address, value)
  }
  
  /**
   * 取消位强制
   */
  unforceBit(address: string): void {
    // 在实际PLC中，强制需要特殊处理
    // 这里简化处理，直接清零
    this.setBit(address, false)
  }
  
  /**
   * 强制字节值
   */
  forceByte(area: MemoryArea, byteAddr: number, value: number): void {
    this.setByte(area, byteAddr, value)
  }
  
  /**
   * 获取内存快照（用于监控）
   */
  getMemorySnapshot(): {
    inputs: Record<string, number>
    outputs: Record<string, number>
    memory: Record<string, number>
    timers: Record<string, TimerState>
    counters: Record<string, CounterState>
  } {
    const toObject = (map: Map<number, number>): Record<string, number> => {
      const obj: Record<string, number> = {}
      map.forEach((value, key) => {
        obj[key] = value
      })
      return obj
    }
    
    const timerObj: Record<string, TimerState> = {}
    this.timers.forEach((state, id) => {
      timerObj[id] = { ...state }
    })
    
    const counterObj: Record<string, CounterState> = {}
    this.counters.forEach((state, id) => {
      counterObj[id] = { ...state }
    })
    
    return {
      inputs: toObject(this._inputs),
      outputs: toObject(this._outputs),
      memory: toObject(this._memory),
      timers: timerObj,
      counters: counterObj
    }
  }
  
  /**
   * 设置输入值（模拟外部输入）
   */
  setInput(address: string, value: boolean): void {
    const { area, byte, bit } = this.parseAddress(address)
    if (area !== MemoryArea.Input) {
      throw new Error('只能设置输入区: ' + address)
    }
    
    let byteValue = this._inputs.get(byte) || 0
    if (value) {
      byteValue |= (1 << bit)
    } else {
      byteValue &= ~(1 << bit)
    }
    this._inputs.set(byte, byteValue)
  }
  
  /**
   * 获取输出值
   */
  getOutput(address: string): boolean {
    const { area, byte, bit } = this.parseAddress(address)
    if (area !== MemoryArea.Output) {
      throw new Error('只能读取输出区: ' + address)
    }
    
    const byteValue = this._outputs.get(byte) || 0
    return (byteValue & (1 << bit)) !== 0
  }
}

// 导出单例
export const plcEngine = new PLCEngine()
