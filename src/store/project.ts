/**
 * 项目Store - 项目与程序管理
 */
import { defineStore } from 'pinia'

// ==================== 类型定义 ====================

export type DataType = 'BOOL' | 'BYTE' | 'WORD' | 'DWORD' | 'INT' | 'DINT' | 'REAL' | 'STRING'
export type DataArea = 'I' | 'Q' | 'M' | 'DB'

export interface Variable {
  id: string
  symbol: string
  address: string
  dataArea: DataArea
  dataType: DataType
  comment: string
  retain: boolean
  initialValue: any
  arrayLength?: number
}

export interface LadderElement {
  id: string
  type: string  // 'NO' | 'NC' | 'COIL' | 'TON' | 'TOF' | 'TP' | 'TONR' | 'CTU' | 'CTD' | 'CTUD' | 'EQ' | 'NE' | 'GT' | 'LT' | 'GE' | 'LE' | 'ADD' | 'SUB' | 'MUL' | 'DIV' | 'MOVE' | 'AND' | 'OR' | 'XOR'
  address?: string
  symbol?: string
  x: number
  y: number
  width: number
  height: number
  params: Record<string, any>  // PT, PV, IN, Q, etc.
}

export interface Connection {
  id: string
  from: string
  to: string
  type: 'serial' | 'parallel'
  fromY?: number
  toY?: number
}

export interface Network {
  id: string
  number: number
  title: string
  elements: LadderElement[]
  connections: Connection[]
}

export interface ProgramBlock {
  id: string
  name: string
  type: 'OB' | 'FC' | 'FB' | 'DB'
  number: number
  networks: Network[]
}

export interface Project {
  id: string
  name: string
  createdAt: number
  modifiedAt: number
  thumbnail?: string
  scanTime: number
  program: {
    ob1: ProgramBlock
    functions: ProgramBlock[]
    functionBlocks: ProgramBlock[]
    globalDataBlocks: ProgramBlock[]
  }
  variables: Variable[]
}

// ==================== Store ====================

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  currentBlock: ProgramBlock | null
  isLoading: boolean
}

export const useProjectStore = defineStore('project', {
  state: (): ProjectState => ({
    projects: [],
    currentProject: null,
    currentBlock: null,
    isLoading: false
  }),
  
  actions: {
    // 加载项目列表
    async loadProjects() {
      this.isLoading = true
      try {
        const data = uni.getStorageSync('projects_index')
        if (data) {
          this.projects = data
        }
      } catch (e) {
        console.error('加载项目列表失败:', e)
      } finally {
        this.isLoading = false
      }
    },
    
    // 保存项目列表索引
    saveProjectsIndex() {
      const index = this.projects.map(p => ({
        id: p.id,
        name: p.name,
        modifiedAt: p.modifiedAt
      }))
      uni.setStorageSync('projects_index', index)
    },
    
    // 创建新项目
    createProject(name: string): Project {
      const project: Project = {
        id: 'p_' + Date.now(),
        name,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        scanTime: 20,
        program: {
          ob1: {
            id: 'ob1',
            name: 'OB1',
            type: 'OB',
            number: 1,
            networks: [this.createEmptyNetwork(1)]
          },
          functions: [],
          functionBlocks: [],
          globalDataBlocks: []
        },
        variables: []
      }
      
      this.projects.push(project)
      this.saveProjectsIndex()
      this.saveProject(project)
      
      return project
    },
    
    // 创建空网络
    createEmptyNetwork(number: number): Network {
      return {
        id: 'net_' + Date.now() + '_' + number,
        number,
        title: '',
        elements: [],
        connections: []
      }
    },
    
    // 加载项目
    async loadProject(projectId: string) {
      this.isLoading = true
      try {
        const data = uni.getStorageSync('project_' + projectId)
        if (data) {
          this.currentProject = data
          this.currentBlock = this.currentProject!.program.ob1
        }
      } catch (e) {
        console.error('加载项目失败:', e)
      } finally {
        this.isLoading = false
      }
    },
    
    // 保存项目
    saveProject(project?: Project) {
      const p = project || this.currentProject
      if (!p) return
      
      p.modifiedAt = Date.now()
      uni.setStorageSync('project_' + p.id, p)
      this.saveProjectsIndex()
    },
    
    // 删除项目
    deleteProject(projectId: string) {
      const index = this.projects.findIndex(p => p.id === projectId)
      if (index > -1) {
        this.projects.splice(index, 1)
        uni.removeStorageSync('project_' + projectId)
        this.saveProjectsIndex()
      }
    },
    
    // 重命名项目
    renameProject(projectId: string, newName: string) {
      const project = this.projects.find(p => p.id === projectId)
      if (project) {
        project.name = newName
        project.modifiedAt = Date.now()
        this.saveProjectsIndex()
        if (this.currentProject?.id === projectId) {
          this.currentProject.name = newName
          this.saveProject()
        }
      }
    },
    
    // 添加变量
    addVariable(variable: Variable) {
      if (!this.currentProject) return
      this.currentProject.variables.push(variable)
      this.saveProject()
    },
    
    // 更新变量
    updateVariable(variableId: string, updates: Partial<Variable>) {
      if (!this.currentProject) return
      const variable = this.currentProject.variables.find(v => v.id === variableId)
      if (variable) {
        Object.assign(variable, updates)
        this.saveProject()
      }
    },
    
    // 删除变量
    deleteVariable(variableId: string) {
      if (!this.currentProject) return
      const index = this.currentProject.variables.findIndex(v => v.id === variableId)
      if (index > -1) {
        this.currentProject.variables.splice(index, 1)
        this.saveProject()
      }
    },
    
    // 添加网络
    addNetwork() {
      if (!this.currentBlock) return
      const newNumber = this.currentBlock.networks.length + 1
      this.currentBlock.networks.push(this.createEmptyNetwork(newNumber))
      this.saveProject()
    },
    
    // 添加元件
    addElement(networkId: string, element: LadderElement) {
      if (!this.currentBlock) return
      const network = this.currentBlock.networks.find(n => n.id === networkId)
      if (network) {
        network.elements.push(element)
        this.saveProject()
      }
    },
    
    // 更新元件
    updateElement(networkId: string, elementId: string, updates: Partial<LadderElement>) {
      if (!this.currentBlock) return
      const network = this.currentBlock.networks.find(n => n.id === networkId)
      if (network) {
        const element = network.elements.find(e => e.id === elementId)
        if (element) {
          Object.assign(element, updates)
          this.saveProject()
        }
      }
    },
    
    // 删除元件
    deleteElement(networkId: string, elementId: string) {
      if (!this.currentBlock) return
      const network = this.currentBlock.networks.find(n => n.id === networkId)
      if (network) {
        const index = network.elements.findIndex(e => e.id === elementId)
        if (index > -1) {
          network.elements.splice(index, 1)
          // 清理相关连接
          network.connections = network.connections.filter(
            c => c.from !== elementId && c.to !== elementId
          )
          this.saveProject()
        }
      }
    },
    
    // 移动元件
    moveElement(networkId: string, elementId: string, x: number, y: number) {
      this.updateElement(networkId, elementId, { x, y })
    }
  }
})
