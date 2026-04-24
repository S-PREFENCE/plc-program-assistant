/**
 * 定时器指令执行器
 * 实现TON/TOF/TP/TONR定时器
 */

import { PLCEngine } from '../PLCEngine'
import { LadderElement } from '../../store/project'

/**
 * 定时器状态
 */
export interface TimerState {
  id: string
  type: 'TON' | 'TOF' | 'TP' | 'TONR'
  Q: boolean        // 定时器输出
  ET: number        // 经过的时间 (ms)
  PT: number        // 预设时间 (ms)
  startTime: number // 开始计时的系统时间
  isRunning: boolean // 是否正在计时
}

/**
 * 定时器指令执行器
 */
export class TimerExecutor {
  private engine: PLCEngine
  private currentTime: number = 0  // 当前PLC时间 (ms)
  
  constructor(engine: PLCEngine) {
    this.engine = engine
  }
  
  /**
   * 更新PLC时间
   */
  setCurrentTime(time: number) {
    this.currentTime = time
  }
  
  /**
   * 执行定时器指令
   */
  execute(element: LadderElement, inputPower: boolean): boolean {
    const timerId = element.address || `T${element.id}`
    const PT = (element.params?.PT as number) || 1000  // 默认1秒
    
    let state = this.engine.timers.get(timerId)
    
    if (!state) {
      // 初始化定时器状态
      state = {
        id: timerId,
        type: element.type as 'TON' | 'TOF' | 'TP' | 'TONR',
        Q: false,
        ET: 0,
        PT: PT,
        startTime: this.currentTime,
        isRunning: false
      }
      this.engine.timers.set(timerId, state)
    }
    
    // 更新预设时间
    state.PT = PT
    
    switch (element.type) {
      case 'TON':
        return this.executeTON(state, inputPower)
      case 'TOF':
        return this.executeTOF(state, inputPower)
      case 'TP':
        return this.executeTP(state, inputPower)
      case 'TONR':
        return this.executeTONR(state, inputPower)
      default:
        return inputPower
    }
  }
  
  /**
   * TON - 通电延时定时器
   * 输入为真开始计时，达到PT后Q输出为真
   */
  private executeTON(state: TimerState, inputPower: boolean): boolean {
    if (inputPower) {
      if (!state.isRunning) {
        // 开始计时
        state.isRunning = true
        state.startTime = this.currentTime
        state.ET = 0
      }
      
      // 更新经过时间
      state.ET = this.currentTime - state.startTime
      
      // 检查是否达到预设时间
      if (state.ET >= state.PT) {
        state.Q = true
        state.ET = state.PT  // 限制最大值
      }
    } else {
      // 输入为假，重置定时器
      state.Q = false
      state.ET = 0
      state.isRunning = false
      state.startTime = this.currentTime
    }
    
    return state.Q
  }
  
  /**
   * TOF - 断电延时定时器
   * 输入从真变假时开始计时，达到PT后Q输出为假
   */
  private executeTOF(state: TimerState, inputPower: boolean): boolean {
    if (inputPower) {
      // 输入为真，输出立即为真，重置计时
      state.Q = true
      state.isRunning = false
      state.ET = 0
    } else {
      // 输入为假，开始计时
      if (!state.isRunning && state.ET === 0) {
        state.isRunning = true
        state.startTime = this.currentTime
      }
      
      if (state.isRunning) {
        state.ET = this.currentTime - state.startTime
        
        if (state.ET >= state.PT) {
          state.Q = false
          state.ET = state.PT
          state.isRunning = false
        }
      }
    }
    
    return state.Q
  }
  
  /**
   * TP - 脉冲定时器
   * 输入上升沿触发，输出固定宽度的脉冲
   */
  private executeTP(state: TimerState, inputPower: boolean): boolean {
    if (inputPower && !state.isRunning && state.ET === 0) {
      // 检测到上升沿，开始脉冲
      state.isRunning = true
      state.startTime = this.currentTime
      state.ET = 0
      state.Q = true
    }
    
    if (state.isRunning) {
      state.ET = this.currentTime - state.startTime
      
      if (state.ET >= state.PT) {
        state.Q = false
        state.ET = state.PT
        state.isRunning = false
      }
    }
    
    return state.Q
  }
  
  /**
   * TONR - 保持型通电延时定时器
   * 计时累加，需要R输入复位
   */
  private executeTONR(state: TimerState, inputPower: boolean): boolean {
    const R = state.params?.R || false
    
    // 复位信号
    if (R) {
      state.Q = false
      state.ET = 0
      state.isRunning = false
      state.startTime = this.currentTime
      return false
    }
    
    if (inputPower) {
      if (!state.isRunning) {
        state.isRunning = true
        state.startTime = this.currentTime
      }
      
      // 累加计时
      state.ET = state.elapsed + (this.currentTime - state.startTime)
      
      if (state.ET >= state.PT) {
        state.Q = true
        state.ET = state.PT
      }
    } else {
      // 保存当前累加时间
      if (state.isRunning) {
        state.elapsed = state.ET
        state.isRunning = false
      }
    }
    
    return state.Q
  }
  
  /**
   * 获取定时器状态
   */
  getTimerState(timerId: string): TimerState | undefined {
    return this.engine.timers.get(timerId)
  }
  
  /**
   * 复位定时器
   */
  resetTimer(timerId: string): void {
    this.engine.timers.delete(timerId)
  }
  
  /**
   * 清除所有定时器
   */
  clearAll(): void {
    this.engine.timers.clear()
  }
}
