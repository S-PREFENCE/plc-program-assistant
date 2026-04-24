/**
 * Canvas交互管理器
 * 负责梯形图编辑器的所有交互逻辑：拖拽、选中、移动、缩放、网格吸附
 */
import type { LadderElement, Network, Connection } from '../store/project'

// 常量定义
export const GRID_SIZE = 20           // 网格大小（像素）
export const ELEMENT_WIDTH = 120     // 元件宽度
export const ELEMENT_HEIGHT = 60     // 元件高度
export const RAIL_X = 40             // 左母线X坐标
export const NETWORK_START_Y = 80    // 网络起始Y坐标
export const ELEMENT_SPACING = 140   // 元件间距

// 颜色定义
export const COLORS = {
  background: '#FFFFFF',
  grid: '#E8E8E8',
  leftRail: '#37474F',
  rightRail: '#37474F',
  wire: '#37474F',
  wireSelected: '#00BCD4',
  elementFill: '#FFFFFF',
  elementStroke: '#37474F',
  elementSelected: '#00BCD4',
  textPrimary: '#37474F',
  textSecondary: '#607D8B',
  powerFlow: '#4CAF50',
  contactNo: '#2196F3',      // 常开触点颜色
  contactNc: '#FF5722',     // 常闭触点颜色
  coil: '#9C27B0',           // 线圈颜色
  timer: '#FF9800',          // 定时器颜色
  counter: '#00BCD4',        // 计数器颜色
  compare: '#795548',        // 比较指令颜色
  math: '#607D8B',           // 数学运算颜色
}

// 元件类型分类
export type ElementCategory = 'contact' | 'coil' | 'timer' | 'counter' | 'compare' | 'math' | 'move' | 'edge' | 'flipflop' | 'other'

export function getElementCategory(type: string): ElementCategory {
  if (['NO', 'NC'].includes(type)) return 'contact'
  if (['COIL', 'SR', 'RS'].includes(type)) return 'coil'
  if (['TON', 'TOF', 'TP', 'TONR'].includes(type)) return 'timer'
  if (['CTU', 'CTD', 'CTUD'].includes(type)) return 'counter'
  if (['EQ', 'NE', 'GT', 'LT', 'GE', 'LE'].includes(type)) return 'compare'
  if (['ADD', 'SUB', 'MUL', 'DIV', 'ABS', 'SQRT', 'AND', 'OR', 'XOR', 'SHL', 'SHR', 'ROL', 'ROR'].includes(type)) return 'math'
  if (['MOVE', 'BLKMOVE'].includes(type)) return 'move'
  if (['P', 'N'].includes(type)) return 'edge'
  if (['SR', 'RS'].includes(type)) return 'flipflop'
  return 'other'
}

// 元件颜色
export function getElementColor(type: string): string {
  const category = getElementCategory(type)
  switch (category) {
    case 'contact': return type === 'NO' ? COLORS.contactNo : COLORS.contactNc
    case 'coil': return COLORS.coil
    case 'timer': return COLORS.timer
    case 'counter': return COLORS.counter
    case 'compare': return COLORS.compare
    case 'math': return COLORS.math
    default: return COLORS.elementStroke
  }
}

// 接口定义
export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface DragState {
  isDragging: boolean
  element: LadderElement | null
  startPoint: Point
  currentPoint: Point
  dragType: 'move' | 'insert' | null
}

export interface SelectionState {
  selectedElementId: string | null
  selectedNetworkId: string | null
  hoveredElementId: string | null
}

export interface ViewportState {
  offsetX: number
  offsetY: number
  scale: number
}

// 分支结构接口
export interface BranchStructure {
  id: string
  startIndex: number  // 分支起点在elements数组中的索引
  endIndex: number    // 分支终点在elements数组中的索引
  branchElements: LadderElement[]  // 分支内的元件
}

// 分支管理器接口
export interface BranchManagerInterface {
  parseElements(elements: LadderElement[]): BranchStructure[]
  getMainLineElements(elements: LadderElement[]): LadderElement[]
  getBranchElements(elements: LadderElement[]): Map<number, LadderElement[]>
}

export interface BranchStructure {
  id: string
  type: 'parallel' | 'branch'
  elements: LadderElement[]
  connections: Connection[]
  parentIndex: number  // 在主线路中的位置索引
}

// Canvas管理器类
export class CanvasManager {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private dpr: number = 1
  
  // 画布尺寸
  private width: number = 0
  private height: number = 0
  
  // 状态
  private networks: Network[] = []
  private currentNetworkIndex: number = 0
  
  // 视口
  private viewport: ViewportState = {
    offsetX: 0,
    offsetY: 0,
    scale: 1
  }
  
  // 选择状态
  private selection: SelectionState = {
    selectedElementId: null,
    selectedNetworkId: null,
    hoveredElementId: null
  }
  
  // 拖拽状态
  private drag: DragState = {
    isDragging: false,
    element: null,
    startPoint: { x: 0, y: 0 },
    currentPoint: { x: 0, y: 0 },
    dragType: null
  }
  
  // 拖拽预览（从指令面板拖入）
  private insertPreview: {
    type: string
    x: number
    y: number
    visible: boolean
  } = {
    type: '',
    x: 0,
    y: 0,
    visible: false
  }
  
  // 回调函数
  public onElementClick?: (element: LadderElement, network: Network) => void
  public onElementMove?: (element: LadderElement, newIndex: number) => void
  public onCanvasClick?: (x: number, y: number) => void
  public onSelectionChange?: (element: LadderElement | null) => void
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Cannot get 2d context')
    this.ctx = context
  }
  
  /**
   * 初始化画布
   */
  init(width: number, height: number, dpr: number = 1): void {
    this.width = width
    this.height = height
    this.dpr = dpr
    this.canvas.width = width * dpr
    this.canvas.height = height * dpr
    this.ctx.scale(dpr, dpr)
  }
  
  /**
   * 设置网络数据
   */
  setNetworks(networks: Network[], currentIndex: number = 0): void {
    this.networks = networks
    this.currentNetworkIndex = Math.min(currentIndex, networks.length - 1)
  }
  
  /**
   * 设置当前网络索引
   */
  setCurrentNetworkIndex(index: number): void {
    this.currentNetworkIndex = index
    this.clearSelection()
    this.render()
  }
  
  /**
   * 获取当前网络
   */
  getCurrentNetwork(): Network | null {
    return this.networks[this.currentNetworkIndex] || null
  }
  
  /**
   * 设置视口缩放
   */
  setScale(scale: number): void {
    this.viewport.scale = Math.max(0.5, Math.min(2, scale))
    this.render()
  }
  
  /**
   * 获取缩放比例
   */
  getScale(): number {
    return this.viewport.scale
  }
  
  // ==================== 渲染 ====================
  
  /**
   * 渲染整个画布
   */
  render(): void {
    const { ctx, width, height, viewport } = this
    
    // 清空画布
    ctx.save()
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    
    // 应用视口变换
    ctx.translate(viewport.offsetX, viewport.offsetY)
    ctx.scale(viewport.scale, viewport.scale)
    
    // 绘制背景网格
    this.drawGrid()
    
    // 绘制当前网络
    const network = this.getCurrentNetwork()
    if (network) {
      this.drawNetwork(network)
    }
    
    // 绘制拖拽预览
    if (this.insertPreview.visible) {
      this.drawInsertPreview()
    }
    
    ctx.restore()
  }
  
  /**
   * 绘制网格背景
   */
  private drawGrid(): void {
    const { ctx, width, height, viewport } = this
    const gridSize = GRID_SIZE
    
    ctx.strokeStyle = COLORS.grid
    ctx.lineWidth = 0.5 / viewport.scale
    
    // 计算可见区域
    const startX = Math.floor(-viewport.offsetX / viewport.scale / gridSize) * gridSize
    const startY = Math.floor(-viewport.offsetY / viewport.scale / gridSize) * gridSize
    const endX = startX + width / viewport.scale + gridSize * 2
    const endY = startY + height / viewport.scale + gridSize * 2
    
    ctx.beginPath()
    for (let x = startX; x < endX; x += gridSize) {
      ctx.moveTo(x, startY)
      ctx.lineTo(x, endY)
    }
    for (let y = startY; y < endY; y += gridSize) {
      ctx.moveTo(startX, y)
      ctx.lineTo(endX, y)
    }
    ctx.stroke()
  }
  
  /**
   * 绘制网络（单个梯形）
   */
  private drawNetwork(network: Network): void {
    const { ctx } = this
    const networkY = NETWORK_START_Y
    
    // 绘制网络标题
    ctx.fillStyle = COLORS.textSecondary
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`Network ${network.number}`, 10, networkY - 25)
    
    if (network.title) {
      ctx.fillText(network.title, 100, networkY - 25)
    }
    
    // 计算主线路的Y坐标（居中）
    const mainRailY = networkY + ELEMENT_HEIGHT / 2
    
    // 绘制左母线
    this.drawLeftRail(networkY)
    
    // 绘制右母线
    this.drawRightRail(networkY)
    
    // 解析并绘制连接线和元件
    this.drawNetworkElements(network)
  }
  
  /**
   * 绘制左母线
   */
  private drawLeftRail(y: number): void {
    const { ctx } = this
    
    ctx.strokeStyle = COLORS.leftRail
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(RAIL_X, y - 20)
    ctx.lineTo(RAIL_X, y + ELEMENT_HEIGHT + 20)
    ctx.stroke()
    
    // 母线端点圆点
    ctx.fillStyle = COLORS.leftRail
    ctx.beginPath()
    ctx.arc(RAIL_X, y - 20, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(RAIL_X, y + ELEMENT_HEIGHT + 20, 3, 0, Math.PI * 2)
    ctx.fill()
  }
  
  /**
   * 绘制右母线
   */
  private drawRightRail(y: number): void {
    const { ctx, width } = this
    const rightRailX = width / this.dpr - RAIL_X
    
    ctx.strokeStyle = COLORS.rightRail
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(rightRailX, y - 20)
    ctx.lineTo(rightRailX, y + ELEMENT_HEIGHT + 20)
    ctx.stroke()
  }
  
  /**
   * 绘制网络中的所有元件和连接线
   * 支持分支结构的绘制
   */
  private drawNetworkElements(network: Network): void {
    const { ctx } = this
    const networkY = NETWORK_START_Y
    const mainRailY = networkY + ELEMENT_HEIGHT / 2
    
    // 解析元件，分离主线路和分支
    const { mainElements, branches } = this.parseElementsWithBranches(network.elements)
    
    // 绘制从左母线到第一个元件的连接线
    const rightRailX = this.width / this.dpr - RAIL_X
    const startX = RAIL_X
    
    if (mainElements.length === 0 && branches.length === 0) {
      // 空网络：从左母线直接到右母线
      ctx.strokeStyle = COLORS.wire
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(RAIL_X, mainRailY)
      ctx.lineTo(rightRailX, mainRailY)
      ctx.stroke()
      return
    }
    
    // 绘制主线路
    let currentX = RAIL_X + 30
    let currentMainIndex = 0
    
    // 绘制从左母线到第一个元件的连接线
    ctx.strokeStyle = COLORS.wire
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(RAIL_X, mainRailY)
    
    // 检查第一个位置是否有分支
    const firstBranch = branches.find(b => b.startIndex === 0)
    if (firstBranch) {
      ctx.lineTo(RAIL_X + 30, mainRailY)
    } else if (mainElements.length > 0) {
      ctx.lineTo(currentX, mainRailY)
      currentX += ELEMENT_WIDTH + 20
    } else {
      ctx.lineTo(rightRailX, mainRailY)
    }
    ctx.stroke()
    
    // 绘制主线路元件
    let mainIndex = 0
    for (let i = 0; i < network.elements.length; i++) {
      const element = network.elements[i]
      
      // 跳过分支标记元件
      if (element.type === 'BRANCH_START' || element.type === 'BRANCH_END') {
        continue
      }
      
      // 检查这个位置是否有分支
      const branch = branches.find(b => b.startIndex === mainIndex)
      if (branch) {
        // 绘制分支
        this.drawParallelBranch(
          currentX - ELEMENT_WIDTH - 20,
          mainRailY,
          mainIndex,
          branch.elements,
          rightRailX
        )
      }
      
      const isSelected = this.selection.selectedElementId === element.id
      const isHovered = this.selection.hoveredElementId === element.id
      
      this.drawElement(element, currentX, mainRailY, isSelected, isHovered)
      
      // 连接线到下一个元件
      const nextBranch = branches.find(b => b.startIndex === mainIndex + 1)
      if (nextBranch) {
        // 绘制到分支起点的连接
        ctx.strokeStyle = COLORS.wire
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(currentX + ELEMENT_WIDTH, mainRailY)
        ctx.lineTo(currentX + ELEMENT_WIDTH + 20, mainRailY)
        ctx.stroke()
        currentX += ELEMENT_WIDTH + 20
      } else if (mainIndex < mainElements.length - 1) {
        ctx.strokeStyle = COLORS.wire
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(currentX + ELEMENT_WIDTH, mainRailY)
        ctx.lineTo(currentX + ELEMENT_WIDTH + 20, mainRailY)
        ctx.stroke()
        currentX += ELEMENT_WIDTH + 20
      } else {
        // 最后一个元件到右母线
        ctx.strokeStyle = COLORS.wire
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(currentX + ELEMENT_WIDTH, mainRailY)
        ctx.lineTo(rightRailX, mainRailY)
        ctx.stroke()
      }
      
      mainIndex++
    }
  }
  
  /**
   * 解析元件列表，分离主线路和分支
   */
  private parseElementsWithBranches(elements: LadderElement[]): {
    mainElements: LadderElement[]
    branches: Array<{ startIndex: number; endIndex: number; elements: LadderElement[] }>
  } {
    const mainElements: LadderElement[] = []
    const branches: Array<{ startIndex: number; endIndex: number; elements: LadderElement[] }> = []
    
    let i = 0
    let mainIndex = 0
    
    while (i < elements.length) {
      const element = elements[i]
      
      if (element.type === 'BRANCH_START') {
        // 找到分支终点
        let endIndex = -1
        for (let j = i + 1; j < elements.length; j++) {
          if (elements[j].type === 'BRANCH_END') {
            endIndex = j
            break
          }
        }
        
        if (endIndex !== -1) {
          // 提取分支内的元件
          const branchElements = elements.slice(i + 1, endIndex)
          branches.push({
            startIndex: mainIndex,
            endIndex: mainIndex + 1,
            elements: branchElements
          })
          i = endIndex + 1
          mainIndex++
          continue
        }
      }
      
      mainElements.push(element)
      i++
      mainIndex++
    }
    
    return { mainElements, branches }
  }
  
  /**
   * 绘制并联分支
   */
  private drawParallelBranch(
    startX: number,
    mainY: number,
    startIndex: number,
    branchElements: LadderElement[],
    rightX: number
  ): void {
    const { ctx } = this
    const branchY = mainY + ELEMENT_HEIGHT + 30
    const endX = rightX - (this.getElementCountAfterBranch(startIndex) * (ELEMENT_WIDTH + 20))
    
    // 绘制分支线：从主线路向下弯折
    ctx.strokeStyle = COLORS.wire
    ctx.lineWidth = 2
    
    // 起点向下
    ctx.beginPath()
    ctx.moveTo(startX + ELEMENT_WIDTH, mainY)
    ctx.lineTo(startX + ELEMENT_WIDTH, branchY)
    ctx.stroke()
    
    // 分支水平线
    const branchElementCount = branchElements.length
    const branchEndX = startX + ELEMENT_WIDTH + 30 + branchElementCount * (ELEMENT_WIDTH + 20)
    
    ctx.beginPath()
    ctx.moveTo(startX + ELEMENT_WIDTH, branchY)
    ctx.lineTo(branchEndX, branchY)
    ctx.stroke()
    
    // 绘制分支内的元件
    let currentX = startX + ELEMENT_WIDTH + 30
    branchElements.forEach((element) => {
      const isSelected = this.selection.selectedElementId === element.id
      const isHovered = this.selection.hoveredElementId === element.id
      this.drawElement(element, currentX, branchY, isSelected, isHovered)
      currentX += ELEMENT_WIDTH + 20
    })
    
    // 从分支向上弯折回主线路
    ctx.beginPath()
    ctx.moveTo(branchEndX + ELEMENT_WIDTH, branchY)
    ctx.lineTo(branchEndX + ELEMENT_WIDTH, mainY)
    ctx.stroke()
  }
  
  /**
   * 获取分支后的元件数量
   */
  private getElementCountAfterBranch(startIndex: number): number {
    const network = this.getCurrentNetwork()
    if (!network) return 0
    
    let count = 0
    let i = startIndex + 1
    while (i < network.elements.length) {
      const element = network.elements[i]
      if (element.type === 'BRANCH_END') break
      if (element.type !== 'BRANCH_START') count++
      i++
    }
    return count
  }
  
  /**
   * 绘制单个元件
   */
  private drawElement(
    element: LadderElement, 
    x: number, 
    y: number,
    isSelected: boolean,
    isHovered: boolean
  ): void {
    const { ctx } = this
    const type = element.type
    
    // 保存当前状态
    ctx.save()
    
    // 绘制引脚连接线
    ctx.strokeStyle = isSelected ? COLORS.wireSelected : COLORS.wire
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + 15, y)
    ctx.moveTo(x + ELEMENT_WIDTH - 15, y)
    ctx.lineTo(x + ELEMENT_WIDTH, y)
    ctx.stroke()
    
    // 根据类型绘制不同的元件
    switch (type) {
      case 'NO':
        this.drawContact(x + 15, y, ELEMENT_WIDTH - 30, ELEMENT_HEIGHT - 20, false, element, isSelected, isHovered)
        break
      case 'NC':
        this.drawContact(x + 15, y, ELEMENT_WIDTH - 30, ELEMENT_HEIGHT - 20, true, element, isSelected, isHovered)
        break
      case 'COIL':
        this.drawCoil(x + 15, y, ELEMENT_WIDTH - 30, ELEMENT_HEIGHT - 20, element, isSelected, isHovered)
        break
      case 'P':
        this.drawEdgeDetector(x + 15, y, ELEMENT_WIDTH - 30, ELEMENT_HEIGHT - 20, 'P', element, isSelected, isHovered)
        break
      case 'N':
        this.drawEdgeDetector(x + 15, y, ELEMENT_WIDTH - 30, ELEMENT_HEIGHT - 20, 'N', element, isSelected, isHovered)
        break
      case 'SR':
      case 'RS':
        this.drawFlipFlop(x + 15, y, ELEMENT_WIDTH - 30, ELEMENT_HEIGHT - 20, type, element, isSelected, isHovered)
        break
      case 'TON':
      case 'TOF':
      case 'TP':
      case 'TONR':
        this.drawTimer(x + 15, y, ELEMENT_WIDTH - 30, ELEMENT_HEIGHT - 20, type, element, isSelected, isHovered)
        break
      case 'CTU':
      case 'CTD':
      case 'CTUD':
        this.drawCounter(x + 15, y, ELEMENT_WIDTH - 30, ELEMENT_HEIGHT - 20, type, element, isSelected, isHovered)
        break
      default:
        this.drawBox(x + 15, y, ELEMENT_WIDTH - 30, ELEMENT_HEIGHT - 20, type, element, isSelected, isHovered)
    }
    
    // 选中高亮
    if (isSelected) {
      ctx.strokeStyle = COLORS.elementSelected
      ctx.lineWidth = 3
      ctx.strokeRect(x + 10, y - ELEMENT_HEIGHT / 2 + 5, ELEMENT_WIDTH + 4, ELEMENT_HEIGHT + 4)
    }
    
    ctx.restore()
  }
  
  /**
   * 绘制触点（常开/常闭）
   */
  private drawContact(
    x: number, y: number, w: number, h: number,
    negated: boolean,
    element: LadderElement,
    isSelected: boolean,
    isHovered: boolean
  ): void {
    const { ctx } = this
    const centerX = x + w / 2
    const centerY = y
    
    // 触点符号
    ctx.strokeStyle = isSelected ? COLORS.wireSelected : COLORS.contactNo
    ctx.lineWidth = 2
    
    // 绘制触点框架
    ctx.beginPath()
    ctx.moveTo(centerX - w/2, centerY - h/2)
    ctx.lineTo(centerX, centerY - h/2)
    ctx.moveTo(centerX, centerY + h/2)
    ctx.lineTo(centerX + w/2, centerY + h/2)
    
    // 绘制触点竖线
    ctx.moveTo(centerX - w/2, centerY - h/2)
    ctx.lineTo(centerX - w/2, centerY + h/2)
    ctx.moveTo(centerX + w/2, centerY - h/2)
    ctx.lineTo(centerX + w/2, centerY + h/2)
    ctx.stroke()
    
    // 绘制常闭斜线
    if (negated) {
      ctx.beginPath()
      ctx.moveTo(centerX - w/2, centerY - h/2)
      ctx.lineTo(centerX + w/2, centerY + h/2)
      ctx.stroke()
    }
    
    // 绘制地址标签
    ctx.fillStyle = COLORS.textPrimary
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(element.address || '??', centerX, centerY + h/2 + 12)
  }
  
  /**
   * 绘制线圈
   */
  private drawCoil(
    x: number, y: number, w: number, h: number,
    element: LadderElement,
    isSelected: boolean,
    isHovered: boolean
  ): void {
    const { ctx } = this
    const centerX = x + w / 2
    const centerY = y
    
    // 线圈符号
    ctx.strokeStyle = isSelected ? COLORS.wireSelected : COLORS.coil
    ctx.lineWidth = 2
    
    // 绘制矩形
    ctx.strokeRect(centerX - w/2, centerY - h/2, w, h)
    
    // 绘制地址标签
    ctx.fillStyle = COLORS.textPrimary
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(element.address || '??', centerX, centerY + h/2 + 12)
  }
  
  /**
   * 绘制边沿检测
   */
  private drawEdgeDetector(
    x: number, y: number, w: number, h: number,
    type: 'P' | 'N',
    element: LadderElement,
    isSelected: boolean,
    isHovered: boolean
  ): void {
    const { ctx } = this
    const centerX = x + w / 2
    const centerY = y
    
    ctx.strokeStyle = isSelected ? COLORS.wireSelected : COLORS.elementStroke
    ctx.lineWidth = 2
    
    // 绘制触点框架
    ctx.beginPath()
    ctx.moveTo(centerX - w/2, centerY - h/2)
    ctx.lineTo(centerX, centerY - h/2)
    ctx.moveTo(centerX, centerY + h/2)
    ctx.lineTo(centerX + w/2, centerY + h/2)
    ctx.moveTo(centerX - w/2, centerY - h/2)
    ctx.lineTo(centerX - w/2, centerY + h/2)
    ctx.moveTo(centerX + w/2, centerY - h/2)
    ctx.lineTo(centerX + w/2, centerY + h/2)
    ctx.stroke()
    
    // 绘制边沿箭头
    ctx.beginPath()
    if (type === 'P') {
      ctx.moveTo(centerX, centerY - h/2)
      ctx.lineTo(centerX - 8, centerY - h/2 - 8)
      ctx.moveTo(centerX, centerY - h/2)
      ctx.lineTo(centerX + 8, centerY - h/2 - 8)
    } else {
      ctx.moveTo(centerX, centerY + h/2)
      ctx.lineTo(centerX - 8, centerY + h/2 + 8)
      ctx.moveTo(centerX, centerY + h/2)
      ctx.lineTo(centerX + 8, centerY + h/2 + 8)
    }
    ctx.stroke()
    
    // 绘制地址标签
    ctx.fillStyle = COLORS.textPrimary
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(element.address || '??', centerX, centerY + h/2 + 12)
  }
  
  /**
   * 绘制触发器
   */
  private drawFlipFlop(
    x: number, y: number, w: number, h: number,
    type: 'SR' | 'RS',
    element: LadderElement,
    isSelected: boolean,
    isHovered: boolean
  ): void {
    const { ctx } = this
    const centerX = x + w / 2
    const centerY = y
    
    ctx.strokeStyle = isSelected ? COLORS.wireSelected : COLORS.coil
    ctx.lineWidth = 2
    
    // 绘制矩形
    ctx.strokeRect(centerX - w/2, centerY - h/2, w, h)
    
    // 绘制标签
    ctx.fillStyle = COLORS.textPrimary
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(type, centerX, centerY - 5)
    
    // 绘制地址标签
    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillText(element.address || '??', centerX, centerY + h/2 + 12)
  }
  
  /**
   * 绘制定时器
   */
  private drawTimer(
    x: number, y: number, w: number, h: number,
    type: string,
    element: LadderElement,
    isSelected: boolean,
    isHovered: boolean
  ): void {
    const { ctx } = this
    const centerX = x + w / 2
    const centerY = y
    const pt = element.params?.PT || 0
    
    ctx.strokeStyle = isSelected ? COLORS.wireSelected : COLORS.timer
    ctx.lineWidth = 2
    
    // 绘制矩形
    ctx.strokeRect(centerX - w/2, centerY - h/2, w, h)
    
    // 绘制类型标签
    ctx.fillStyle = COLORS.textPrimary
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(type, centerX, centerY - 3)
    
    // 绘制PT值
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillText(`PT:${pt}ms`, centerX, centerY + 10)
  }
  
  /**
   * 绘制计数器
   */
  private drawCounter(
    x: number, y: number, w: number, h: number,
    type: string,
    element: LadderElement,
    isSelected: boolean,
    isHovered: boolean
  ): void {
    const { ctx } = this
    const centerX = x + w / 2
    const centerY = y
    const pv = element.params?.PV || 0
    
    ctx.strokeStyle = isSelected ? COLORS.wireSelected : COLORS.counter
    ctx.lineWidth = 2
    
    // 绘制矩形
    ctx.strokeRect(centerX - w/2, centerY - h/2, w, h)
    
    // 绘制类型标签
    ctx.fillStyle = COLORS.textPrimary
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(type, centerX, centerY - 3)
    
    // 绘制PV值
    ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillText(`PV:${pv}`, centerX, centerY + 10)
  }
  
  /**
   * 绘制通用功能块
   */
  private drawBox(
    x: number, y: number, w: number, h: number,
    type: string,
    element: LadderElement,
    isSelected: boolean,
    isHovered: boolean
  ): void {
    const { ctx } = this
    const centerX = x + w / 2
    const centerY = y
    
    ctx.strokeStyle = isSelected ? COLORS.wireSelected : COLORS.elementStroke
    ctx.lineWidth = 2
    
    // 绘制矩形
    ctx.strokeRect(centerX - w/2, centerY - h/2, w, h)
    
    // 绘制标签
    ctx.fillStyle = COLORS.textPrimary
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(type, centerX, centerY + 4)
  }
  
  /**
   * 绘制拖拽预览
   */
  private drawInsertPreview(): void {
    const { ctx } = this
    const { type, x, y } = this.insertPreview
    
    ctx.save()
    ctx.globalAlpha = 0.5
    
    // 绘制预览位置
    const previewY = NETWORK_START_Y + ELEMENT_HEIGHT / 2
    const previewX = this.snapToGrid(x)
    
    // 绘制预览元件
    const previewElement: LadderElement = {
      id: 'preview',
      type,
      x: previewX,
      y: previewY,
      width: ELEMENT_WIDTH,
      height: ELEMENT_HEIGHT,
      params: {},
      address: ''
    }
    
    this.drawElement(previewElement, previewX, previewY, false, false)
    
    ctx.restore()
  }
  
  // ==================== 交互处理 ====================
  
  /**
   * 处理鼠标/触摸按下
   */
  handlePointerDown(x: number, y: number, touchId?: number): void {
    // 转换为画布坐标
    const canvasPoint = this.screenToCanvas(x, y)
    
    // 检查是否点击了元件
    const element = this.hitTestElement(canvasPoint.x, canvasPoint.y)
    
    if (element) {
      // 点击了元件
      this.selection.selectedElementId = element.id
      this.drag.isDragging = true
      this.drag.element = element
      this.drag.startPoint = canvasPoint
      this.drag.currentPoint = canvasPoint
      this.drag.dragType = 'move'
      
      // 触发回调
      const network = this.getCurrentNetwork()
      if (network && this.onElementClick) {
        this.onElementClick(element, network)
      }
      if (this.onSelectionChange) {
        this.onSelectionChange(element)
      }
    } else {
      // 点击了空白区域
      this.clearSelection()
      
      // 检查是否在插入区域（顶部工具栏区域之外）
      if (canvasPoint.y > NETWORK_START_Y - 20) {
        this.drag.isDragging = false
        if (this.onCanvasClick) {
          this.onCanvasClick(canvasPoint.x, canvasPoint.y)
        }
      }
    }
    
    this.render()
  }
  
  /**
   * 处理鼠标/触摸移动
   */
  handlePointerMove(x: number, y: number): void {
    const canvasPoint = this.screenToCanvas(x, y)
    
    // 拖拽移动元件
    if (this.drag.isDragging && this.drag.dragType === 'move') {
      this.drag.currentPoint = canvasPoint
      this.render()
      
      // 绘制移动预览
      this.drawMovePreview()
      return
    }
    
    // 悬停检测
    const element = this.hitTestElement(canvasPoint.x, canvasPoint.y)
    if (element?.id !== this.selection.hoveredElementId) {
      this.selection.hoveredElementId = element?.id || null
      this.canvas.style.cursor = element ? 'pointer' : 'default'
      this.render()
    }
  }
  
  /**
   * 处理鼠标/触摸释放
   */
  handlePointerUp(x: number, y: number): void {
    const canvasPoint = this.screenToCanvas(x, y)
    
    if (this.drag.isDragging && this.drag.dragType === 'move' && this.drag.element) {
      // 计算移动后的新位置索引
      const newIndex = this.calculateNewIndex(canvasPoint.x)
      
      if (newIndex !== -1) {
        // 触发移动回调
        if (this.onElementMove) {
          this.onElementMove(this.drag.element!, newIndex)
        }
      }
    }
    
    // 重置拖拽状态
    this.drag.isDragging = false
    this.drag.element = null
    this.drag.dragType = null
    
    this.render()
  }
  
  /**
   * 处理拖拽预览（从指令面板拖入）
   */
  handleInsertDrag(type: string, screenX: number, screenY: number, visible: boolean): void {
    if (visible) {
      const rect = this.canvas.getBoundingClientRect()
      const canvasPoint = this.screenToCanvas(screenX - rect.left, screenY - rect.top)
      this.insertPreview = {
        type,
        x: canvasPoint.x,
        y: canvasPoint.y,
        visible: true
      }
    } else {
      this.insertPreview.visible = false
    }
    this.render()
  }
  
  /**
   * 完成插入操作
   */
  completeInsert(type: string, screenX: number, screenY: number): number | null {
    const rect = this.canvas.getBoundingClientRect()
    const canvasPoint = this.screenToCanvas(screenX - rect.left, screenY - rect.top)
    
    // 检查是否在有效区域
    if (canvasPoint.y < NETWORK_START_Y - 20 || canvasPoint.y > NETWORK_START_Y + ELEMENT_HEIGHT + 20) {
      return null
    }
    
    // 计算插入位置
    const index = this.calculateNewIndex(canvasPoint.x)
    this.insertPreview.visible = false
    this.render()
    
    return index
  }
  
  /**
   * 绘制移动预览
   */
  private drawMovePreview(): void {
    if (!this.drag.isDragging || !this.drag.element || !this.drag.startPoint) return
    
    const { ctx } = this
    const element = this.drag.element
    const deltaX = this.drag.currentPoint.x - this.drag.startPoint.x
    
    // 计算新位置
    const network = this.getCurrentNetwork()
    if (!network) return
    
    const elementIndex = network.elements.findIndex(e => e.id === element.id)
    if (elementIndex === -1) return
    
    // 计算当前位置
    const currentX = RAIL_X + 30 + elementIndex * (ELEMENT_WIDTH + 20)
    const newX = this.snapToGrid(currentX + deltaX)
    const networkY = NETWORK_START_Y
    const wireY = networkY + ELEMENT_HEIGHT / 2
    
    // 半透明绘制移动中的元件
    ctx.save()
    ctx.globalAlpha = 0.7
    this.drawElement(element, newX, wireY, true, false)
    ctx.restore()
  }
  
  /**
   * 命中测试：检测是否点击了某个元件
   */
  private hitTestElement(x: number, y: number): LadderElement | null {
    const network = this.getCurrentNetwork()
    if (!network) return null
    
    const networkY = NETWORK_START_Y
    const elementY = networkY + ELEMENT_HEIGHT / 2
    
    // 遍历所有元件
    for (let i = 0; i < network.elements.length; i++) {
      const elem = network.elements[i]
      const elemX = RAIL_X + 30 + i * (ELEMENT_WIDTH + 20)
      
      // 元件的边界框
      const bounds = {
        x: elemX,
        y: elementY - ELEMENT_HEIGHT / 2,
        width: ELEMENT_WIDTH,
        height: ELEMENT_HEIGHT
      }
      
      if (x >= bounds.x && x <= bounds.x + bounds.width &&
          y >= bounds.y && y <= bounds.y + bounds.height) {
        return elem
      }
    }
    
    return null
  }
  
  /**
   * 计算元件移动后的新索引
   */
  private calculateNewIndex(x: number): number {
    const network = this.getCurrentNetwork()
    if (!network) return -1
    
    // 网格吸附
    const snappedX = this.snapToGrid(x)
    
    // 计算位置（考虑左母线和间距）
    const relX = snappedX - RAIL_X - 30
    let index = Math.round(relX / (ELEMENT_WIDTH + 20))
    
    // 边界限制
    index = Math.max(0, Math.min(network.elements.length, index))
    
    return index
  }
  
  /**
   * 网格吸附
   */
  private snapToGrid(value: number): number {
    return Math.round(value / GRID_SIZE) * GRID_SIZE
  }
  
  /**
   * 屏幕坐标转画布坐标
   */
  private screenToCanvas(screenX: number, screenY: number): Point {
    return {
      x: (screenX - this.viewport.offsetX) / this.viewport.scale,
      y: (screenY - this.viewport.offsetY) / this.viewport.scale
    }
  }
  
  /**
   * 清空选择
   */
  clearSelection(): void {
    this.selection.selectedElementId = null
    this.selection.selectedNetworkId = null
    if (this.onSelectionChange) {
      this.onSelectionChange(null)
    }
  }
  
  /**
   * 删除选中的元件
   */
  deleteSelected(): boolean {
    if (!this.selection.selectedElementId) return false
    
    const network = this.getCurrentNetwork()
    if (!network) return false
    
    const index = network.elements.findIndex(e => e.id === this.selection.selectedElementId)
    if (index > -1) {
      network.elements.splice(index, 1)
      this.clearSelection()
      this.render()
      return true
    }
    return false
  }
  
  /**
   * 获取选中元件
   */
  getSelectedElement(): LadderElement | null {
    if (!this.selection.selectedElementId) return null
    
    const network = this.getCurrentNetwork()
    if (!network) return null
    
    return network.elements.find(e => e.id === this.selection.selectedElementId) || null
  }
  
  /**
   * 获取元件在网络中的索引
   */
  getElementIndex(elementId: string): number {
    const network = this.getCurrentNetwork()
    if (!network) return -1
    return network.elements.findIndex(e => e.id === elementId)
  }
  
  /**
   * 移动元件到新位置
   */
  moveElementToIndex(elementId: string, newIndex: number): void {
    const network = this.getCurrentNetwork()
    if (!network) return
    
    const currentIndex = network.elements.findIndex(e => e.id === elementId)
    if (currentIndex === -1 || currentIndex === newIndex) return
    
    // 移动元素
    const [element] = network.elements.splice(currentIndex, 1)
    network.elements.splice(newIndex, 0, element)
    
    this.render()
  }
}

// 导出常量供外部使用
export { ELEMENT_WIDTH, ELEMENT_HEIGHT, RAIL_X, NETWORK_START_Y, ELEMENT_SPACING, GRID_SIZE }
