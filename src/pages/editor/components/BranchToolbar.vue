<template>
  <view class="branch-toolbar">
    <view class="toolbar-item" @click="toggleBranchMode">
      <view class="icon-wrapper" :class="{ active: branchMode }">
        <text class="icon">⫿</text>
      </view>
      <text class="label">{{ branchMode ? '退出分支' : '插入分支' }}</text>
    </view>
    
    <view v-if="branchMode" class="branch-actions">
      <view class="toolbar-item" @click="addParallelBranch">
        <view class="icon-wrapper">
          <text class="icon">⊢⫨</text>
        </view>
        <text class="label">并联分支</text>
      </view>
      
      <view class="toolbar-item" @click="addSeriesBranch">
        <view class="icon-wrapper">
          <text class="icon">⊣⫩</text>
        </view>
        <text class="label">串联分支</text>
      </view>
      
      <view class="toolbar-item" @click="removeBranch" :class="{ disabled: !hasSelectedBranch }">
        <view class="icon-wrapper">
          <text class="icon">✕</text>
        </view>
        <text class="label">删除分支</text>
      </view>
    </view>
    
    <view v-if="branchMode && selectedBranchIndex >= 0" class="branch-info">
      <text class="info-text">已选中: 位置 {{ selectedBranchIndex + 1 }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProjectStore } from '@/store/project'
import { useEditorStore } from '@/store/editor'

const projectStore = useProjectStore()
const editorStore = useEditorStore()

// 分支模式
const branchMode = ref(false)

// 选中的分支索引
const selectedBranchIndex = ref(-1)

// 当前网络
const currentNetwork = computed(() => {
  const index = editorStore.currentNetworkIndex
  return projectStore.currentProgram?.ob1?.[index]
})

// 是否有选中的分支
const hasSelectedBranch = computed(() => selectedBranchIndex.value >= 0)

// 分支列表
const branches = computed(() => {
  if (!currentNetwork.value) return []
  return currentNetwork.value.elements.filter(e => 
    e.type === 'BRANCH_START' || e.type === 'BRANCH_END'
  )
})

// 切换分支模式
function toggleBranchMode() {
  branchMode.value = !branchMode.value
  if (!branchMode.value) {
    selectedBranchIndex.value = -1
  }
}

// 添加并联分支（上下并行）
function addParallelBranch() {
  if (!currentNetwork.value) return
  
  const insertIndex = findInsertPosition()
  
  // 创建分支标记
  const branchStart: LadderElement = {
    id: `branch_${Date.now()}_start`,
    type: 'BRANCH_START',
    address: '',
    symbol: '',
    position: { x: 0, y: 0 },
    size: { width: 0, height: 0 },
    params: { branchType: 'parallel' }
  }
  
  const branchEnd: LadderElement = {
    id: `branch_${Date.now()}_end`,
    type: 'BRANCH_END',
    address: '',
    symbol: '',
    position: { x: 0, y: 0 },
    size: { width: 0, height: 0 },
    params: { branchType: 'parallel' }
  }
  
  // 在insertIndex位置插入分支标记
  const elements = [...currentNetwork.value.elements]
  
  // 找到合适的位置插入
  // 查找该位置是否是主线路
  let insertIdx = 0
  let mainCount = 0
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].type !== 'BRANCH_START' && elements[i].type !== 'BRANCH_END') {
      if (mainCount === insertIndex) {
        insertIdx = i
        break
      }
      mainCount++
    }
  }
  
  // 在该位置之前插入分支
  elements.splice(insertIdx, 0, branchStart)
  
  // 在该位置之后（主线路之后）插入分支结束标记
  // 找到下一个主线路元件的位置
  let endInsertIdx = insertIdx + 1
  for (let i = insertIdx + 1; i < elements.length; i++) {
    if (elements[i].type !== 'BRANCH_START' && elements[i].type !== 'BRANCH_END') {
      // 在这个元件之后插入结束标记
      endInsertIdx = i + 1
      break
    }
  }
  elements.splice(endInsertIdx, 0, branchEnd)
  
  // 更新网络
  projectStore.updateNetwork(editorStore.currentNetworkIndex, {
    ...currentNetwork.value,
    elements
  })
  
  // 添加到命令历史
  editorStore.addCommand({
    type: 'add_branch',
    networkIndex: editorStore.currentNetworkIndex,
    branchStartId: branchStart.id,
    branchEndId: branchEnd.id,
    insertIndex
  })
  
  selectedBranchIndex.value = insertIndex
}

// 添加串联分支（嵌套分支）
function addSeriesBranch() {
  if (!currentNetwork.value) return
  
  const insertIndex = findInsertPosition()
  
  const branchStart: LadderElement = {
    id: `branch_${Date.now()}_start`,
    type: 'BRANCH_START',
    address: '',
    symbol: '',
    position: { x: 0, y: 0 },
    size: { width: 0, height: 0 },
    params: { branchType: 'series' }
  }
  
  const branchEnd: LadderElement = {
    id: `branch_${Date.now()}_end`,
    type: 'BRANCH_END',
    address: '',
    symbol: '',
    position: { x: 0, y: 0 },
    size: { width: 0, height: 0 },
    params: { branchType: 'series' }
  }
  
  // 在主线路插入
  const elements = [...currentNetwork.value.elements]
  
  let insertIdx = 0
  let mainCount = 0
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].type !== 'BRANCH_START' && elements[i].type !== 'BRANCH_END') {
      if (mainCount === insertIndex) {
        insertIdx = i
        break
      }
      mainCount++
    }
  }
  
  elements.splice(insertIdx + 1, 0, branchStart)
  
  // 找到串联分支结束位置（在主线路之后）
  let endInsertIdx = insertIdx + 2
  for (let i = insertIdx + 2; i < elements.length; i++) {
    if (elements[i].type !== 'BRANCH_START' && elements[i].type !== 'BRANCH_END') {
      endInsertIdx = i + 1
      break
    }
  }
  
  elements.splice(endInsertIdx, 0, branchEnd)
  
  projectStore.updateNetwork(editorStore.currentNetworkIndex, {
    ...currentNetwork.value,
    elements
  })
  
  editorStore.addCommand({
    type: 'add_branch',
    networkIndex: editorStore.currentNetworkIndex,
    branchStartId: branchStart.id,
    branchEndId: branchEnd.id,
    insertIndex
  })
}

// 删除选中的分支
function removeBranch() {
  if (!hasSelectedBranch.value || !currentNetwork.value) return
  
  const elements = currentNetwork.value.elements
  
  // 找到对应的分支标记
  let startIdx = -1
  let endIdx = -1
  let mainCount = 0
  
  for (let i = 0; i < elements.length; i++) {
    if (elements[i].type !== 'BRANCH_START' && elements[i].type !== 'BRANCH_END') {
      if (mainCount === selectedBranchIndex.value) {
        // 找到目标位置，向前找最近的分支开始
        for (let j = i - 1; j >= 0; j--) {
          if (elements[j].type === 'BRANCH_START') {
            startIdx = j
            break
          }
        }
        break
      }
      mainCount++
    }
  }
  
  if (startIdx === -1) return
  
  // 找到对应的结束标记
  let depth = 1
  for (let i = startIdx + 1; i < elements.length; i++) {
    if (elements[i].type === 'BRANCH_START') depth++
    if (elements[i].type === 'BRANCH_END') depth--
    if (depth === 0) {
      endIdx = i
      break
    }
  }
  
  if (endIdx === -1) return
  
  // 删除分支（包含其内部的元件）
  const newElements = elements.filter((e, i) => i < startIdx || i > endIdx)
  
  projectStore.updateNetwork(editorStore.currentNetworkIndex, {
    ...currentNetwork.value,
    elements: newElements
  })
  
  editorStore.addCommand({
    type: 'remove_branch',
    networkIndex: editorStore.currentNetworkIndex,
    startIndex: startIdx,
    endIndex: endIdx,
    removedElements: elements.slice(startIdx, endIdx + 1)
  })
  
  selectedBranchIndex.value = -1
}

// 查找插入位置
function findInsertPosition(): number {
  // 简单实现：插入到主线路末尾
  if (!currentNetwork.value) return 0
  
  const mainCount = currentNetwork.value.elements.filter(
    e => e.type !== 'BRANCH_START' && e.type !== 'BRANCH_END'
  ).length
  
  return Math.max(0, mainCount)
}

// 选中分支
function selectBranch(index: number) {
  selectedBranchIndex.value = index
}

// 暴露方法给父组件
defineExpose({
  selectBranch,
  exitBranchMode: () => { branchMode.value = false }
})
</script>

<style scoped lang="scss">
.branch-toolbar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 8px;
}

.toolbar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:active {
    transform: scale(0.98);
  }
  
  &.disabled {
    opacity: 0.5;
    pointer-events: none;
  }
}

.icon-wrapper {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e0e0e0;
  border-radius: 4px;
  
  &.active {
    background: #00BCD4;
    color: #fff;
  }
}

.icon {
  font-size: 18px;
  color: #37474f;
  
  .active & {
    color: #fff;
  }
}

.label {
  font-size: 13px;
  color: #37474f;
}

.branch-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 16px;
  border-left: 2px solid #e0e0e0;
}

.branch-info {
  padding: 6px 12px;
  background: #e3f2fd;
  border-radius: 4px;
  
  .info-text {
    font-size: 12px;
    color: #1976d2;
  }
}
</style>
