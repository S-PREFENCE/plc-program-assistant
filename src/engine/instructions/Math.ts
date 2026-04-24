/**
 * 数学运算指令执行器
 * 实现各种数学运算指令
 */

import { PLCEngine, MemoryArea } from '../PLCEngine'
import { LadderElement } from '../../store/project'

/**
 * 数学运算指令执行器
 */
export class MathExecutor {
  private engine: PLCEngine
  
  constructor(engine: PLCEngine) {
    this.engine = engine
  }
  
  /**
   * 执行数学运算指令
   */
  execute(element: LadderElement, inputPower: boolean): boolean {
    if (!inputPower) return false
    
    const OUT = element.params?.OUT || element.address
    
    switch (element.type) {
      case 'ADD':
        return this.executeAdd(element, OUT)
      case 'SUB':
        return this.executeSub(element, OUT)
      case 'MUL':
        return this.executeMul(element, OUT)
      case 'DIV':
        return this.executeDiv(element, OUT)
      case 'ABS':
        return this.executeAbs(element, OUT)
      case 'NEG':
        return this.executeNeg(element, OUT)
      case 'MOVE':
        return this.executeMove(element, OUT)
      default:
        return inputPower
    }
  }
  
  /**
   * ADD - 加法
   */
  private executeAdd(element: LadderElement, outAddr: string): boolean {
    const IN1 = this.parseValue(element.params?.IN1)
    const IN2 = this.parseValue(element.params?.IN2)
    
    if (IN1 === null || IN2 === null) return false
    
    const result = IN1 + IN2
    this.writeResult(outAddr, result, element.params?.dataType)
    
    return true
  }
  
  /**
   * SUB - 减法
   */
  private executeSub(element: LadderElement, outAddr: string): boolean {
    const IN1 = this.parseValue(element.params?.IN1)
    const IN2 = this.parseValue(element.params?.IN2)
    
    if (IN1 === null || IN2 === null) return false
    
    const result = IN1 - IN2
    this.writeResult(outAddr, result, element.params?.dataType)
    
    return true
  }
  
  /**
   * MUL - 乘法
   */
  private executeMul(element: LadderElement, outAddr: string): boolean {
    const IN1 = this.parseValue(element.params?.IN1)
    const IN2 = this.parseValue(element.params?.IN2)
    
    if (IN1 === null || IN2 === null) return false
    
    const result = IN1 * IN2
    this.writeResult(outAddr, result, element.params?.dataType)
    
    return true
  }
  
  /**
   * DIV - 除法
   */
  private executeDiv(element: LadderElement, outAddr: string): boolean {
    const IN1 = this.parseValue(element.params?.IN1)
    const IN2 = this.parseValue(element.params?.IN2)
    
    if (IN1 === null || IN2 === null || IN2 === 0) return false
    
    const result = IN1 / IN2
    this.writeResult(outAddr, result, element.params?.dataType)
    
    return true
  }
  
  /**
   * ABS - 绝对值
   */
  private executeAbs(element: LadderElement, outAddr: string): boolean {
    const IN = this.parseValue(element.params?.IN)
    if (IN === null) return false
    
    const result = Math.abs(IN)
    this.writeResult(outAddr, result, element.params?.dataType)
    
    return true
  }
  
  /**
   * NEG - 取反
   */
  private executeNeg(element: LadderElement, outAddr: string): boolean {
    const IN = this.parseValue(element.params?.IN)
    if (IN === null) return false
    
    const result = -IN
    this.writeResult(outAddr, result, element.params?.dataType)
    
    return true
  }
  
  /**
   * MOVE - 移动
   */
  private executeMove(element: LadderElement, outAddr: string): boolean {
    const IN = this.parseValue(element.params?.IN)
    if (IN === null) return false
    
    this.writeResult(outAddr, IN, element.params?.dataType)
    
    return true
  }
  
  /**
   * 解析输入值
   */
  private parseValue(value: any): number | null {
    if (value === undefined || value === null) return null
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const parsed = parseFloat(value)
      return isNaN(parsed) ? null : parsed
    }
    return null
  }
  
  /**
   * 写入结果到地址
   */
  private writeResult(address: string, value: number, dataType?: string): void {
    try {
      const { area, byte, bit } = this.parseAddress(address)
      
      switch (dataType) {
        case 'INT':
          this.engine.setInt(area, byte, Math.round(value))
          break
        case 'DINT':
        case 'REAL':
          this.engine.setDInt(area, byte, Math.round(value))
          break
        default:
          // 默认按位处理
          if (bit !== undefined) {
            this.engine.setBit(address, value !== 0)
          } else {
            this.engine.setWord(area, byte, Math.round(value))
          }
      }
    } catch {
      // 地址无效
    }
  }
  
  /**
   * 解析地址
   */
  private parseAddress(address: string): { area: MemoryArea; byte: number; bit?: number } {
    const bitMatch = address.match(/^([IQMD])(\d+)\.(\d+)$/)
    if (bitMatch) {
      return {
        area: bitMatch[1] as MemoryArea,
        byte: parseInt(bitMatch[2]),
        bit: parseInt(bitMatch[3])
      }
    }
    
    const wordMatch = address.match(/^([IQMD])W(\d+)$/)
    if (wordMatch) {
      return {
        area: wordMatch[1] as MemoryArea,
        byte: parseInt(wordMatch[2])
      }
    }
    
    const dwordMatch = address.match(/^([IQMD])D(\d+)$/)
    if (dwordMatch) {
      return {
        area: dwordMatch[1] as MemoryArea,
        byte: parseInt(dwordMatch[2])
      }
    }
    
    // 默认字节地址
    const byteMatch = address.match(/^([IQMD])B?(\d+)$/)
    if (byteMatch) {
      return {
        area: byteMatch[1] as MemoryArea,
        byte: parseInt(byteMatch[2])
      }
    }
    
    throw new Error(`无效的地址格式: ${address}`)
  }
}
