/**
 * 撤销/重做命令系统
 * 实现完整的编辑历史管理
 */
import type { Network, LadderElement } from '../store/project'

// 命令类型
export type CommandType = 
  | 'ADD_ELEMENT'
  | 'DELETE_ELEMENT'
  | 'MOVE_ELEMENT'
  | 'UPDATE_ELEMENT'
  | 'ADD_NETWORK'
  | 'DELETE_NETWORK'
  | 'REORDER_ELEMENTS'
  | 'BATCH'

// 命令接口
export interface Command {
  type: CommandType
  description: string
  execute: () => void
  undo: () => void
  data: any
}

// 简单命令
export interface SimpleCommand {
  type: CommandType
  description: string
  networkId: string
  data: any
  previousData?: any
}

// 批量命令
export interface BatchCommand {
  type: 'BATCH'
  description: string
  commands: Command[]
}

// 命令历史管理器
export class CommandHistory {
  private undoStack: Command[] = []
  private redoStack: Command[] = []
  private maxHistorySize: number = 50
  
  // 回调
  public onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void
  
  /**
   * 执行命令
   */
  execute(command: Command): void {
    command.execute()
    this.undoStack.push(command)
    
    // 清空重做栈
    this.redoStack = []
    
    // 限制历史大小
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift()
    }
    
    this.notifyChange()
  }
  
  /**
   * 撤销
   */
  undo(): boolean {
    const command = this.undoStack.pop()
    if (!command) return false
    
    command.undo()
    this.redoStack.push(command)
    
    this.notifyChange()
    return true
  }
  
  /**
   * 重做
   */
  redo(): boolean {
    const command = this.redoStack.pop()
    if (!command) return false
    
    command.execute()
    this.undoStack.push(command)
    
    this.notifyChange()
    return true
  }
  
  /**
   * 是否可以撤销
   */
  canUndo(): boolean {
    return this.undoStack.length > 0
  }
  
  /**
   * 是否可以重做
   */
  canRedo(): boolean {
    return this.redoStack.length > 0
  }
  
  /**
   * 清空历史
   */
  clear(): void {
    this.undoStack = []
    this.redoStack = []
    this.notifyChange()
  }
  
  /**
   * 获取撤销栈大小
   */
  getUndoSize(): number {
    return this.undoStack.length
  }
  
  /**
   * 获取重做栈大小
   */
  getRedoSize(): number {
    return this.redoStack.length
  }
  
  /**
   * 通知状态变化
   */
  private notifyChange(): void {
    if (this.onHistoryChange) {
      this.onHistoryChange(this.canUndo(), this.canRedo())
    }
  }
}

// ==================== 命令工厂 ====================

/**
 * 添加元件命令
 */
export function createAddElementCommand(
  network: Network,
  element: LadderElement,
  index: number
): Command {
  return {
    type: 'ADD_ELEMENT',
    description: `添加 ${element.type} 元件`,
    execute: () => {
      network.elements.splice(index, 0, element)
    },
    undo: () => {
      const idx = network.elements.findIndex(e => e.id === element.id)
      if (idx > -1) {
        network.elements.splice(idx, 1)
      }
    },
    data: { element, index }
  }
}

/**
 * 删除元件命令
 */
export function createDeleteElementCommand(
  network: Network,
  element: LadderElement,
  index: number
): Command {
  return {
    type: 'DELETE_ELEMENT',
    description: `删除 ${element.type} 元件`,
    execute: () => {
      const idx = network.elements.findIndex(e => e.id === element.id)
      if (idx > -1) {
        network.elements.splice(idx, 1)
      }
    },
    undo: () => {
      network.elements.splice(index, 0, element)
    },
    data: { element, index }
  }
}

/**
 * 移动元件命令
 */
export function createMoveElementCommand(
  network: Network,
  elementId: string,
  fromIndex: number,
  toIndex: number
): Command {
  return {
    type: 'MOVE_ELEMENT',
    description: '移动元件',
    execute: () => {
      const element = network.elements.find(e => e.id === elementId)
      if (!element) return
      
      // 从原位置移除
      const idx = network.elements.findIndex(e => e.id === elementId)
      if (idx > -1) {
        network.elements.splice(idx, 1)
      }
      // 插入到新位置
      network.elements.splice(toIndex, 0, element)
    },
    undo: () => {
      const element = network.elements.find(e => e.id === elementId)
      if (!element) return
      
      // 从当前位置移除
      const idx = network.elements.findIndex(e => e.id === elementId)
      if (idx > -1) {
        network.elements.splice(idx, 1)
      }
      // 恢复到原位置
      network.elements.splice(fromIndex, 0, element)
    },
    data: { elementId, fromIndex, toIndex }
  }
}

/**
 * 更新元件命令
 */
export function createUpdateElementCommand(
  network: Network,
  elementId: string,
  updates: Partial<LadderElement>
): Command {
  const element = network.elements.find(e => e.id === elementId)
  if (!element) {
    throw new Error(`Element ${elementId} not found`)
  }
  
  // 保存更新前的状态
  const previousData: Partial<LadderElement> = {}
  for (const key of Object.keys(updates)) {
    previousData[key as keyof LadderElement] = element[key as keyof LadderElement] as any
  }
  
  return {
    type: 'UPDATE_ELEMENT',
    description: `更新元件属性`,
    execute: () => {
      Object.assign(element, updates)
    },
    undo: () => {
      Object.assign(element, previousData)
    },
    data: { elementId, updates, previousData }
  }
}

/**
 * 重排元件命令
 */
export function createReorderElementsCommand(
  network: Network,
  fromIndices: number[],
  toIndices: number[]
): Command {
  // 保存原始顺序
  const originalOrder = [...network.elements]
  
  return {
    type: 'REORDER_ELEMENTS',
    description: '重排元件',
    execute: () => {
      // 执行重排
      const elements = [...network.elements]
      fromIndices.forEach((fromIdx, i) => {
        const toIdx = toIndices[i]
        const [element] = elements.splice(fromIdx, 1)
        elements.splice(toIdx, 0, element)
      })
      network.elements = elements
    },
    undo: () => {
      // 恢复原始顺序
      network.elements = [...originalOrder]
    },
    data: { fromIndices, toIndices, originalOrder }
  }
}

/**
 * 批量命令
 */
export function createBatchCommand(commands: Command[], description: string = '批量操作'): Command {
  return {
    type: 'BATCH',
    description,
    execute: () => {
      commands.forEach(cmd => cmd.execute())
    },
    undo: () => {
      // 逆序撤销
      for (let i = commands.length - 1; i >= 0; i--) {
        commands[i].undo()
      }
    },
    data: { commands }
  }
}
