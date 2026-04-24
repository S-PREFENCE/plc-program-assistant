<template>
  <view class="container">
    <!-- 页面标题 -->
    <view class="page-header">
      <text class="page-title">{{ isZhCN ? '项目列表' : 'Projects' }}</text>
      <view class="header-actions">
        <view class="lang-btn" @tap="toggleLang">
          <text>{{ isZhCN ? 'EN' : '中文' }}</text>
        </view>
      </view>
    </view>

    <!-- 项目列表 -->
    <view class="project-list" v-if="projects.length > 0">
      <view 
        class="project-card" 
        v-for="project in projects" 
        :key="project.id"
        @tap="openProject(project.id)"
        @longpress="showProjectActions(project)"
      >
        <view class="card-thumb">
          <image v-if="project.thumbnail" :src="project.thumbnail" mode="aspectFill" />
          <view v-else class="thumb-placeholder">
            <text>PLC</text>
          </view>
        </view>
        <view class="card-content">
          <text class="card-name">{{ project.name }}</text>
          <text class="card-time">{{ formatTime(project.modifiedAt) }}</text>
          <view class="card-meta">
            <text class="meta-tag">OB1</text>
            <text class="meta-tag">{{ project.scanTime }}ms</text>
          </view>
        </view>
        <view class="card-arrow">
          <text>></text>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view class="empty-state" v-else>
      <text class="empty-icon">📁</text>
      <text class="empty-text">{{ isZhCN ? '暂无项目' : 'No projects yet' }}</text>
      <text class="empty-hint">{{ isZhCN ? '点击下方按钮创建新项目' : 'Tap below to create a new project' }}</text>
    </view>

    <!-- 新建按钮 -->
    <view class="create-btn" @tap="showCreateDialog">
      <text class="create-icon">+</text>
      <text class="create-text">{{ isZhCN ? '新建项目' : 'New Project' }}</text>
    </view>

    <!-- 底部TabBar占位 -->
    <view class="tab-bar-placeholder"></view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '@/store/project'
import { useSettingsStore } from '@/store/settings'

const projectStore = useProjectStore()
const settingsStore = useSettingsStore()

const isZhCN = computed(() => settingsStore.isZhCN)
const projects = computed(() => 
  [...projectStore.projects].sort((a, b) => b.modifiedAt - a.modifiedAt)
)

function toggleLang() {
  settingsStore.toggleLanguage()
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - timestamp
  
  if (diff < 60000) return isZhCN.value ? '刚刚' : 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}${isZhCN.value ? '分钟前' : 'm ago'}`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}${isZhCN.value ? '小时前' : 'h ago'}`
  
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}/${day}`
}

function openProject(id: string) {
  projectStore.loadProject(id)
  uni.navigateTo({ url: '/pages/editor/main' })
}

function showCreateDialog() {
  uni.showModal({
    title: isZhCN.value ? '新建项目' : 'New Project',
    placeholderText: isZhCN.value ? '请输入项目名称' : 'Enter project name',
    editable: true,
    success: (res) => {
      if (res.confirm && res.content && res.content.trim()) {
        const project = projectStore.createProject(res.content.trim())
        projectStore.currentProject = project
        uni.navigateTo({ url: '/pages/editor/main' })
      }
    }
  })
}

function showProjectActions(project: any) {
  const actions = [
    { name: isZhCN.value ? '重命名' : 'Rename', action: 'rename' },
    { name: isZhCN.value ? '删除' : 'Delete', action: 'delete', style: 'destructive' }
  ]
  
  uni.showActionSheet({
    itemList: actions.map(a => a.name),
    success: (res) => {
      const action = actions[res.tapIndex].action
      if (action === 'rename') {
        showRenameDialog(project)
      } else if (action === 'delete') {
        showDeleteConfirm(project)
      }
    }
  })
}

function showRenameDialog(project: any) {
  uni.showModal({
    title: isZhCN.value ? '重命名' : 'Rename',
    content: project.name,
    placeholderText: isZhCN.value ? '请输入新名称' : 'Enter new name',
    editable: true,
    success: (res) => {
      if (res.confirm && res.content && res.content.trim()) {
        projectStore.renameProject(project.id, res.content.trim())
      }
    }
  })
}

function showDeleteConfirm(project: any) {
  uni.showModal({
    title: isZhCN.value ? '确认删除' : 'Confirm Delete',
    content: isZhCN.value ? `确定要删除项目"${project.name}"吗？此操作不可恢复。` : `Delete project "${project.name}"? This cannot be undone.`,
    confirmColor: '#F44336',
    success: (res) => {
      if (res.confirm) {
        projectStore.deleteProject(project.id)
      }
    }
  })
}
</script>

<style lang="scss" scoped>
@import '@/styles/common.scss';

.container {
  min-height: 100vh;
  background: $bg-page;
  padding: $spacing-md;
  padding-bottom: 200rpx;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-md 0;
  margin-bottom: $spacing-md;
}

.page-title {
  font-size: $font-xxl;
  font-weight: 600;
  color: $text-primary;
}

.header-actions {
  display: flex;
  gap: $spacing-sm;
}

.lang-btn {
  padding: $spacing-xs $spacing-sm;
  background: $bg-card;
  border-radius: $radius-sm;
  font-size: $font-sm;
  color: $primary-color;
}

.project-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.project-card {
  display: flex;
  align-items: center;
  background: $bg-card;
  border-radius: $radius-md;
  padding: $spacing-md;
  box-shadow: $shadow-light;
  
  &:active {
    background: $bg-panel;
  }
}

.card-thumb {
  width: 120rpx;
  height: 120rpx;
  border-radius: $radius-sm;
  overflow: hidden;
  margin-right: $spacing-md;
  
  image {
    width: 100%;
    height: 100%;
  }
}

.thumb-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, $primary-color, $primary-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  
  text {
    color: $text-white;
    font-size: $font-lg;
    font-weight: 600;
  }
}

.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.card-name {
  font-size: $font-lg;
  font-weight: 600;
  color: $text-primary;
}

.card-time {
  font-size: $font-sm;
  color: $text-secondary;
}

.card-meta {
  display: flex;
  gap: $spacing-sm;
  margin-top: $spacing-xs;
}

.meta-tag {
  padding: 2rpx $spacing-sm;
  background: rgba($primary-color, 0.1);
  color: $primary-color;
  font-size: $font-xs;
  border-radius: $radius-full;
}

.card-arrow {
  color: $text-disabled;
  font-size: $font-lg;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx $spacing-xl;
}

.empty-icon {
  font-size: 160rpx;
  opacity: 0.5;
  margin-bottom: $spacing-md;
}

.empty-text {
  font-size: $font-lg;
  color: $text-secondary;
  margin-bottom: $spacing-sm;
}

.empty-hint {
  font-size: $font-sm;
  color: $text-disabled;
}

.create-btn {
  position: fixed;
  bottom: 180rpx;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-md $spacing-xl;
  background: $primary-color;
  color: $text-white;
  border-radius: $radius-full;
  box-shadow: 0 8rpx 24rpx rgba($primary-color, 0.4);
  
  &:active {
    transform: translateX(-50%) scale(0.95);
  }
}

.create-icon {
  font-size: $font-xl;
  font-weight: 300;
}

.create-text {
  font-size: $font-md;
  font-weight: 500;
}

.tab-bar-placeholder {
  height: 120rpx;
}
</style>
