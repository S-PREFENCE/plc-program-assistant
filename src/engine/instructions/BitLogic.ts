/**
 * 位逻辑指令执行器
 * 实现NO/NC/Coil/SR/RS/边沿检测等指令
 */

import { PLCEngine, MemoryArea } from '../PLCEngine'
import { LadderElement } from '../../store/project'

/**
 * 边沿检测历史状态
 */
interface EdgeHistory {
  lastInput: boolean  // 上次扫描的输入状态
  lastOutput: boolean // 上次扫描的输出状态
}

export class BitLogicExecutor {
  private engine: PLCEngine
  private edgeHistory: Map<string, EdgeHistory> = new Map()
  
  constructor(engine: PLCEngine) {
    this.engine = engine
  }
  
  /**
   * 执行位逻辑指令
   */
  execute(element: LadderElement, inputPower: boolean): boolean {
    const address = element.address || ''
    
    switch (element.type) {
      case 'NO':
        return this.executeNO(address, inputPower)
      
      case 'NC':
        return this.executeNC(address, inputPower)
      
      case 'COIL':
        return this.executeCoil(address, inputPower)
      
      case 'SET_COIL':
        return this.executeSetCoil(address, inputPower)
      
      case 'RESET_COIL':
        return this.executeResetCoil(address, inputPower)
      
      case 'SR':
        return this.executeSR(address, inputPower, element.params)
      
      case 'RS':
        return this.executeRS(address, inputPower, element.params)
      
      case 'POSITIVE_EDGE':
        return this.executePositiveEdge(address, inputPower)
      
      case 'NEGATIVE_EDGE':
        return this.executeNegativeEdge(address, inputPower)
      
      default:
        return inputPower
    }
  }
  
  /**
   * 常开触点 (NO - Normally Open)
   * 当地址位为TRUE且有能流输入时，导通
   */
  private executeNO(address: string, inputPower: boolean): boolean {
    if (!inputPower) return false
    
    try {
      const bitValue = this.engine.getBit(address)
      return bitValue === true
    } catch {
      return false
    }
  }
  
  /**
   * 常闭触点 (NC - Normally Closed)
   * 当地址位为FALSE时导通（取反）
   */
  private executeNC(address: string, inputPower: boolean): boolean {
    if (!inputPower) return false
    
    try {
      const bitValue = this.engine.getBit(address)
      return bitValue === false
    } catch {
      return false
    }
  }
  
  /**
   * 输出线圈 (Coil)
   * 将能流状态写入地址位
   */
  private executeCoil(address: string, inputPower: boolean): boolean {
    try {
      this.engine.setBit(address, inputPower)
    } catch {
      // 地址无效，静默失败
    }
    return inputPower  // 线圈不阻断能流
  }
  
  /**
   * 置位线圈 (Set Coil)
   * 一旦有能流，置位为TRUE，且保持
   */
  private executeSetCoil(address: string, inputPower: boolean): boolean {
    if (inputPower) {
      try {
        this.engine.setBit(address, true)
      } catch {
        // 地址无效
      }
    }
    return inputPower
  }
  
  /**
   * 复位线圈 (Reset Coil)
   * 一旦有能流，复位为FALSE
   */
  private executeResetCoil(address: string, inputPower: boolean): boolean {
    if (inputPower) {
      try {
        this.engine.setBit(address, false)
      } catch {
        // 地址无效
      }
    }
    return inputPower
  }
  
  /**
   * SR置位优先触发器
   * S输入优先：同时为真时执行置位
   */
  private executeSR(address: string, inputPower: boolean, params?: Record<string, any>): boolean {
    const setBit = params?.setBit || ''
    const resetBit = params?.resetBit || ''
    
    // 复位优先检查（如果有复位信号）
    if (resetBit && this.engine.getBit(resetBit)) {
      this.engine.setBit(address, false)
    }
    // 置位检查
    else if (inputPower && setBit && this.engine.getBit(setBit)) {
      this.engine.setBit(address, true)
    }
    
    return inputPower
  }
  
  /**
   * RS复位优先触发器
   * R输入优先：同时为真时执行复位
   */
  private executeRS(address: string, inputPower: boolean, params?: Record<string, any>): boolean {
    const setBit = params?.setBit || ''
    const resetBit = params?.resetBit || ''
    
    // 置位优先检查（如果有置位信号）
    if (inputPower && setBit && this.engine.getBit(setBit)) {
      this.engine.setBit(address, true)
    }
    // 复位检查
    else if (resetBit && this.engine.getBit(resetBit)) {
      this.engine.setBit(address, false)
    }
    
    return inputPower
  }
  
  /**
   * 上升沿检测 (Positive Edge - P)
   * 当输入从FALSE变为TRUE时，输出一个脉冲
   */
  private executePositiveEdge(address: string, inputPower: boolean): boolean {
    const history = this.edgeHistory.get(address) || { lastInput: false, lastOutput: false }
    
    // 检测上升沿：上次为false，本次为true
    const risingEdge = !history.lastInput && inputPower
    
    // 更新历史状态
    history.lastInput = inputPower
    history.lastOutput = risingEdge
    this.edgeHistory.set(address, history)
    
    return risingEdge
  }
  
  /**
   * 下降沿检测 (Negative Edge - N)
   * 当输入从TRUE变为FALSE时，输出一个脉冲
   */
  private executeNegativeEdge(address: string, inputPower: boolean): boolean {
    const history = this.edgeHistory.get(address) || { lastInput: false, lastOutput: false }
    
    // 检测下降沿：上次为true，本次为false
    const fallingEdge = history.lastInput && !inputPower
    
    // 更新历史状态
    history.lastInput = inputPower
    history.lastOutput = fallingEdge
    this.edgeHistory.set(address, history)
    
    return fallingEdge
  }
  
  /**
   * 清除边沿检测历史（PLC复位时调用）
   */
  clearHistory(): void {
    this.edgeHistory.clear()
  }
}
