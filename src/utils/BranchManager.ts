/**
 * 分支结构管理器
 * 支持梯形图的并联电路（并行分支）
 */
import type { LadderElement, Connection } from '../store/project'

// 分支类型
export type BranchType = 'serial' | 'parallel' | 'merge'

// 分支节点
export interface BranchNode {
  id: string
  type: 'rail' | 'element' | 'junction'
  elementId?: string
  x: number
  y: number
  inputs: string[]   // 输入节点ID
  outputs: string[]   // 输出节点ID
}

// 分支路径
export interface BranchPath {
  id: string
  nodes: BranchNode[]
  startX: number
  endX: number
}

// 并联分支结构
export interface ParallelBranch {
  id: string
  startJunctionId: string  // 起点节点
  endJunctionId: string    // 终点节点
  paths: BranchPath[]
  startX: number           // 分支开始X坐标
  endX: number             // 分支结束X坐标
  startY: number           // 分支开始Y坐标
  endY: number             // 分支结束Y坐标
}

// 网格常量
export const GRID_SIZE = 20
export const ELEMENT_WIDTH = 120
export const ELEMENT_HEIGHT = 60
export const RAIL_X = 40
export const NETWORK_START_Y = 80

/**
 * 分支结构管理器类
 */
export class BranchManager {
  private branches: Map<string, ParallelBranch> = new Map()
  private networkElements: LadderElement[] = []
  
  /**
   * 设置网络元件
   */
  setElements(elements: LadderElement[]): void {
    this.networkElements = elements
    this.parseBranches()
  }
  
  /**
   * 解析分支结构
   * 从元件中识别并联分支
   */
  private parseBranches(): void {
    this.branches.clear()
    
    // 查找并行分支的起点（特殊标记的元件）
    for (let i = 0; i < this.networkElements.length; i++) {
      const element = this.networkElements[i]
      
      // 检查是否是并行分支起点
      if (element.type.startsWith('BRANCH_START')) {
        const branchId = element.id
        const startIndex = i
        
        // 查找对应的终点
        let endIndex = -1
        for (let j = i + 1; j < this.networkElements.length; j++) {
          if (this.networkElements[j].type === 'BRANCH_END') {
            endIndex = j
            break
          }
        }
        
        if (endIndex !== -1) {
          const branch = this.createBranch(branchId, startIndex, endIndex)
          this.branches.set(branchId, branch)
        }
      }
    }
  }
  
  /**
   * 创建分支结构
   */
  private createBranch(id: string, startIndex: number, endIndex: number): ParallelBranch {
    const startElement = this.networkElements[startIndex]
    const endElement = this.networkElements[endIndex]
    
    // 计算分支位置
    const startX = RAIL_X + 30 + startIndex * (ELEMENT_WIDTH + 20)
    const endX = RAIL_X + 30 + endIndex * (ELEMENT_WIDTH + 20)
    const startY = NETWORK_START_Y + ELEMENT_HEIGHT / 2
    const endY = startY
    
    // 创建分支路径
    const mainPath: BranchPath = {
      id: `${id}_main`,
      nodes: []
    }
    
    const branchPath: BranchPath = {
      id: `${id}_branch`,
      nodes: []
    }
    
    // 解析中间的分支内容
    for (let i = startIndex + 1; i < endIndex; i++) {
      const element = this.networkElements[i]
      
      // 创建节点
      const node: BranchNode = {
        id: `${id}_node_${i}`,
        type: 'element',
        elementId: element.id,
        x: RAIL_X + 30 + i * (ELEMENT_WIDTH + 20),
        y: startY + ELEMENT_HEIGHT + 30,  // 分支在主线路下方
        inputs: [`${id}_node_${i - 1}`],
        outputs: [`${id}_node_${i + 1}`]
      }
      
      branchPath.nodes.push(node)
    }
    
    return {
      id,
      startJunctionId: `${id}_start`,
      endJunctionId: `${id}_end`,
      paths: [mainPath, branchPath],
      startX,
      endX,
      startY,
      endY
    }
  }
  
  /**
   * 检查某个位置是否可以插入分支起点
   */
  canInsertBranchStart(index: number): boolean {
    // 检查是否有足够的空间
    if (index >= this.networkElements.length - 1) return false
    
    // 检查前面是否有分支
    const element = this.networkElements[index]
    return element && !element.type.includes('BRANCH')
  }
  
  /**
   * 在指定位置插入分支起点
   */
  insertBranchStart(index: number): LadderElement {
    const branchStart: LadderElement = {
      id: 'branch_start_' + Date.now(),
      type: 'BRANCH_START',
      address: '',
      symbol: '',
      x: 0,
      y: 0,
      width: ELEMENT_WIDTH,
      height: ELEMENT_HEIGHT,
      params: { branchIndex: this.branches.size }
    }
    
    return branchStart
  }
  
  /**
   * 在指定位置插入分支终点
   */
  insertBranchEnd(index: number): LadderElement {
    const branchEnd: LadderElement = {
      id: 'branch_end_' + Date.now(),
      type: 'BRANCH_END',
      address: '',
      symbol: '',
      x: 0,
      y: 0,
      width: ELEMENT_WIDTH,
      height: ELEMENT_HEIGHT,
      params: {}
    }
    
    return branchEnd
  }
  
  /**
   * 检查元件是否在分支内
   */
  isInBranch(elementId: string): boolean {
    for (const branch of this.branches.values()) {
      for (const path of branch.paths) {
        for (const node of path.nodes) {
          if (node.elementId === elementId) {
            return true
          }
        }
      }
    }
    return false
  }
  
  /**
   * 获取元件所在的分支
   */
  getBranchOfElement(elementId: string): ParallelBranch | null {
    for (const branch of this.branches.values()) {
      for (const path of branch.paths) {
        for (const node of path.nodes) {
          if (node.elementId === elementId) {
            return branch
          }
        }
      }
    }
    return null
  }
  
  /**
   * 获取所有分支
   */
  getAllBranches(): ParallelBranch[] {
    return Array.from(this.branches.values())
  }
  
  /**
   * 删除分支
   */
  deleteBranch(branchId: string): void {
    this.branches.delete(branchId)
  }
  
  /**
   * 计算分支的渲染路径
   */
  calculateBranchPath(startIndex: number, endIndex: number): string {
    const startX = RAIL_X + 30 + startIndex * (ELEMENT_WIDTH + 20)
    const midX = startX + (ELEMENT_WIDTH + 20) / 2
    const endX = RAIL_X + 30 + endIndex * (ELEMENT_WIDTH + 20)
    const mainY = NETWORK_START_Y + ELEMENT_HEIGHT / 2
    const branchY = mainY + ELEMENT_HEIGHT + 30
    
    // 绘制从起点到分支的路径
    let path = `M ${RAIL_X} ${mainY}`
    path += ` L ${startX} ${mainY}`
    
    // 向下弯折
    path += ` L ${startX} ${branchY}`
    
    // 分支水平线
    path += ` L ${endX} ${branchY}`
    
    // 向上弯折到终点
    path += ` L ${endX} ${mainY}`
    
    // 连接到右母线
    path += ` L ${this.getRightRailX()} ${mainY}`
    
    return path
  }
  
  /**
   * 获取右母线X坐标
   */
  private getRightRailX(): number {
    return RAIL_X + 30 + this.networkElements.length * (ELEMENT_WIDTH + 20) + 50
  }
  
  /**
   * 清除所有分支
   */
  clear(): void {
    this.branches.clear()
  }
}

// 导出函数：判断是否为分支相关元件
export function isBranchElement(type: string): boolean {
  return type === 'BRANCH_START' || type === 'BRANCH_END' || type === 'BRANCH_MID'
}

// 导出函数：判断元件是否可以作为分支内容
export function canBeInBranch(type: string): boolean {
  // 常开、常闭、边沿检测、比较指令可以放在分支中
  return ['NO', 'NC', 'P', 'N', 'EQ', 'NE', 'GT', 'LT', 'GE', 'LE'].includes(type)
}