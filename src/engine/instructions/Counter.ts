/**
 * 计数器指令执行器
 * 实现CTU/CTD/CTUD计数器
 */

import { PLCEngine } from '../PLCEngine'
import { LadderElement } from '../../store/project'

/**
 * 计数器状态
 */
export interface CounterState {
  id: string
  type: 'CTU' | 'CTD' | 'CTUD'
  Q: boolean        // 计数器输出
  QU: boolean       // 递增计数器输出
  QD: boolean       // 递减计数器输出
  CV: number         // 当前计数值
  PV: number         // 预设值
  lastCU: boolean    // 上次扫描的CU输入
  lastCD: boolean    // 上次扫描的CD输入
}

/**
 * 计数器指令执行器
 */
export class CounterExecutor {
  private engine: PLCEngine
  
  constructor(engine: PLCEngine) {
    this.engine = engine
  }
  
  /**
   * 执行计数器指令
   */
  execute(element: LadderElement, inputPower: boolean): boolean {
    const counterId = element.address || `C${element.id}`
    const PV = (element.params?.PV as number) || 10  // 默认预设值10
    
    let state = this.engine.counters.get(counterId)
    
    if (!state) {
      // 初始化计数器状态
      state = {
        id: counterId,
        type: element.type as 'CTU' | 'CTD' | 'CTUD',
        Q: false,
        QU: false,
        QD: false,
        CV: 0,
        PV: PV,
        lastCU: false,
        lastCD: false
      }
      this.engine.counters.set(counterId, state)
    }
    
    // 更新预设值
    state.PV = PV
    
    switch (element.type) {
      case 'CTU':
        return this.executeCTU(state, inputPower)
      case 'CTD':
        return this.executeCTD(state, inputPower)
      case 'CTUD':
        return this.executeCTUD(state, inputPower)
      default:
        return inputPower
    }
  }
  
  /**
   * CTU - 递增计数器
   * CU输入上升沿时计数值+1，达到PV时Q输出为真
   * R输入为真时复位计数器
   */
  private executeCTU(state: CounterState, inputPower: boolean): boolean {
    // 检查R输入（如果有的话）
    const R = state.params?.R || false
    if (R) {
      state.CV = 0
      state.Q = false
      state.lastCU = false
      return false
    }
    
    // 检测CU上升沿
    const cuRisingEdge = inputPower && !state.lastCU
    state.lastCU = inputPower
    
    if (cuRisingEdge) {
      state.CV++
      
      if (state.CV >= state.PV) {
        state.Q = true
        state.CV = state.PV  // 限制最大值
      }
    }
    
    return state.Q
  }
  
  /**
   * CTD - 递减计数器
   * CD输入上升沿时计数值-1，达到0时Q输出为真
   * LD输入为真时加载预设值
   */
  private executeCTD(state: CounterState, inputPower: boolean): boolean {
    // 检查LD输入
    const LD = state.params?.LD || false
    if (LD) {
      state.CV = state.PV
      state.Q = false
      state.lastCD = false
      return false
    }
    
    // 检测CD上升沿
    const cdRisingEdge = inputPower && !state.lastCD
    state.lastCD = inputPower
    
    if (cdRisingEdge && state.CV > 0) {
      state.CV--
      
      if (state.CV <= 0) {
        state.Q = true
        state.CV = 0
      }
    }
    
    return state.Q
  }
  
  /**
   * CTUD - 递增递减计数器
   * CU上升沿递增，CD上升沿递减
   * QU达到PV时为真，QD达到0时为真
   */
  private executeCTUD(state: CounterState, inputPower: boolean): boolean {
    // 检查R和LD输入
    const R = state.params?.R || false
    const LD = state.params?.LD || false
    
    if (R) {
      // 复位到0
      state.CV = 0
      state.QU = false
      state.Q = false
    }
    
    if (LD) {
      // 加载预设值
      state.CV = state.PV
      state.QD = false
      state.Q = false
    }
    
    // 检测CU上升沿（递增）
    const cuRisingEdge = inputPower && !state.lastCU
    state.lastCU = inputPower
    
    // 检测CD上升沿（递减）
    const cdRisingEdge = state.params?.CD && !state.lastCD
    state.lastCD = state.params?.CD || false
    
    if (cuRisingEdge && state.CV < state.PV) {
      state.CV++
      
      if (state.CV >= state.PV) {
        state.QU = true
      }
    }
    
    if (cdRisingEdge && state.CV > 0) {
      state.CV--
      
      if (state.CV <= 0) {
        state.QD = true
      }
    }
    
    // 统一Q输出
    state.Q = state.QU || state.QD
    
    return state.Q
  }
  
  /**
   * 获取计数器状态
   */
  getCounterState(counterId: string): CounterState | undefined {
    return this.engine.counters.get(counterId)
  }
  
  /**
   * 设置计数器当前值
   */
  setCounterValue(counterId: string, value: number): void {
    const state = this.engine.counters.get(counterId)
    if (state) {
      state.CV = Math.max(0, Math.min(value, state.PV))
    }
  }
  
  /**
   * 复位计数器
   */
  resetCounter(counterId: string): void {
    this.engine.counters.delete(counterId)
  }
  
  /**
   * 清除所有计数器
   */
  clearAll(): void {
    this.engine.counters.clear()
  }
}
