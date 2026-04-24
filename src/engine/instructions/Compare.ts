/**
 * 比较指令执行器
 * 实现各种比较指令
 */

import { LadderElement } from '../../store/project'

export class CompareExecutor {
  /**
   * 执行比较指令
   */
  execute(element: LadderElement, inputPower: boolean): boolean {
    if (!inputPower) return false
    
    const IN1 = this.parseValue(element.params?.IN1)
    const IN2 = this.parseValue(element.params?.IN2)
    
    if (IN1 === null || IN2 === null) return false
    
    switch (element.type) {
      case 'COMPARE_EQUAL':
        return IN1 === IN2
      case 'COMPARE_NOT_EQUAL':
        return IN1 !== IN2
      case 'COMPARE_GREATER':
        return IN1 > IN2
      case 'COMPARE_LESS':
        return IN1 < IN2
      case 'COMPARE_GREATER_EQUAL':
        return IN1 >= IN2
      case 'COMPARE_LESS_EQUAL':
        return IN1 <= IN2
      default:
        return false
    }
  }
  
  /**
   * 解析比较值
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
}
