<template>
  <view class="container">
    <!-- 顶部区域 -->
    <view class="header">
      <view class="logo">
        <text class="logo-icon">⚡</text>
        <text class="logo-text">PLC编程助手</text>
      </view>
      <view class="lang-toggle" @tap="toggleLanguage">
        <text>{{ settingsStore.isZhCN ? 'EN' : '中文' }}</text>
      </view>
    </view>

    <!-- 功能入口 -->
    <view class="feature-grid">
      <view 
        class="feature-card" 
        v-for="feature in features" 
        :key="feature.id"
        @tap="navigateTo(feature.path)"
      >
        <view class="feature-icon" :style="{ background: feature.bgColor }">
          <text>{{ feature.icon }}</text>
        </view>
        <view class="feature-info">
          <text class="feature-title">{{ feature.title }}</text>
          <text class="feature-desc">{{ feature.desc }}</text>
        </view>
      </view>
    </view>

    <!-- 快捷操作 -->
    <view class="quick-actions">
      <view class="section-title">
        <text>{{ settingsStore.isZhCN ? '快捷操作' : 'Quick Actions' }}</text>
      </view>
      <view class="action-buttons">
        <view class="action-btn primary" @tap="createNewProject">
          <text class="action-icon">+</text>
          <text>{{ settingsStore.isZhCN ? '新建项目' : 'New Project' }}</text>
        </view>
        <view class="action-btn secondary" @tap="openLastProject">
          <text class="action-icon">▶</text>
          <text>{{ settingsStore.isZhCN ? '继续编辑' : 'Continue' }}</text>
        </view>
      </view>
    </view>

    <!-- 最近项目 -->
    <view class="recent-projects" v-if="recentProjects.length > 0">
      <view class="section-title">
        <text>{{ settingsStore.isZhCN ? '最近项目' : 'Recent Projects' }}</text>
        <text class="more" @tap="goToProjects">{{ settingsStore.isZhCN ? '查看全部 >' : 'More >' }}</text>
      </view>
      <view class="project-list">
        <view 
          class="project-item" 
          v-for="project in recentProjects" 
          :key="project.id"
          @tap="openProject(project.id)"
        >
          <view class="project-thumb">
            <text class="thumb-placeholder">PLC</text>
          </view>
          <view class="project-info">
            <text class="project-name">{{ project.name }}</text>
            <text class="project-time">{{ formatTime(project.modifiedAt) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 版本信息 -->
    <view class="version-info">
      <text>v1.0.0 | PLC Programming Assistant</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProjectStore } from '@/store/project'
import { useSettingsStore } from '@/store/settings'

const projectStore = useProjectStore()
const settingsStore = useSettingsStore()

const features = computed(() => [
  {
    id: 'projects',
    icon: '📁',
    title: settingsStore.isZhCN ? '项目' : 'Projects',
    desc: settingsStore.isZhCN ? '管理编程项目' : 'Manage projects',
    path: '/pages/projects/list',
    bgColor: 'rgba(0, 188, 212, 0.1)'
  },
  {
    id: 'editor',
    icon: '🔧',
    title: settingsStore.isZhCN ? '编程' : 'Editor',
    desc: settingsStore.isZhCN ? '梯形图编辑器' : 'Ladder editor',
    path: '/pages/editor/main',
    bgColor: 'rgba(76, 175, 80, 0.1)'
  },
  {
    id: 'monitor',
    icon: '📊',
    title: settingsStore.isZhCN ? '监控' : 'Monitor',
    desc: settingsStore.isZhCN ? '在线状态监控' : 'Online monitoring',
    path: '/pages/monitor/main',
    bgColor: 'rgba(255, 152, 0, 0.1)'
  },
  {
    id: 'tools',
    icon: '🧮',
    title: settingsStore.isZhCN ? '工具' : 'Tools',
    desc: settingsStore.isZhCN ? '辅助计算工具' : 'Calculator tools',
    path: '/pages/tools/main',
    bgColor: 'rgba(156, 39, 176, 0.1)'
  }
])

const recentProjects = computed(() => {
  return [...projectStore.projects]
    .sort((a, b) => b.modifiedAt - a.modifiedAt)
    .slice(0, 3)
})

function toggleLanguage() {
  settingsStore.toggleLanguage()
}

function navigateTo(path: string) {
  uni.navigateTo({ url: path })
}

function createNewProject() {
  uni.showModal({
    title: settingsStore.isZhCN ? '新建项目' : 'New Project',
    placeholderText: settingsStore.isZhCN ? '请输入项目名称' : 'Enter project name',
    editable: true,
    success: (res) => {
      if (res.confirm && res.content) {
        const project = projectStore.createProject(res.content)
        projectStore.currentProject = project
        uni.navigateTo({ url: '/pages/editor/main' })
      }
    }
  })
}

function openLastProject() {
  if (recentProjects.value.length > 0) {
    openProject(recentProjects.value[0].id)
  } else {
    createNewProject()
  }
}

function openProject(id: string) {
  projectStore.loadProject(id)
  uni.navigateTo({ url: '/pages/editor/main' })
}

function goToProjects() {
  uni.switchTab({ url: '/pages/projects/list' })
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}/${day}`
}
</script>

<style lang="scss" scoped>
@import '@/styles/common.scss';

.container {
  min-height: 100vh;
  background: $bg-page;
  padding: $spacing-md;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-md 0;
  margin-bottom: $spacing-lg;
}

.logo {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.logo-icon {
  font-size: 48rpx;
}

.logo-text {
  font-size: $font-xl;
  font-weight: 600;
  color: $text-primary;
}

.lang-toggle {
  padding: $spacing-xs $spacing-sm;
  background: $bg-card;
  border-radius: $radius-sm;
  font-size: $font-sm;
  color: $primary-color;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-md;
  margin-bottom: $spacing-lg;
}

.feature-card {
  background: $bg-card;
  border-radius: $radius-md;
  padding: $spacing-md;
  box-shadow: $shadow-light;
  
  &:active {
    opacity: 0.8;
  }
}

.feature-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: $radius-md;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  margin-bottom: $spacing-sm;
}

.feature-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.feature-title {
  font-size: $font-md;
  font-weight: 600;
  color: $text-primary;
}

.feature-desc {
  font-size: $font-xs;
  color: $text-secondary;
}

.quick-actions {
  margin-bottom: $spacing-lg;
}

.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-md;
  font-size: $font-md;
  font-weight: 600;
  color: $text-primary;
  
  .more {
    font-size: $font-sm;
    font-weight: normal;
    color: $primary-color;
  }
}

.action-buttons {
  display: flex;
  gap: $spacing-md;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;
  padding: $spacing-md;
  border-radius: $radius-md;
  font-size: $font-md;
  
  &.primary {
    background: $primary-color;
    color: $text-white;
  }
  
  &.secondary {
    background: $bg-card;
    color: $text-primary;
    box-shadow: $shadow-light;
  }
  
  .action-icon {
    font-size: $font-lg;
  }
}

.recent-projects {
  margin-bottom: $spacing-lg;
}

.project-list {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.project-item {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  background: $bg-card;
  border-radius: $radius-md;
  padding: $spacing-md;
  box-shadow: $shadow-light;
  
  &:active {
    opacity: 0.8;
  }
}

.project-thumb {
  width: 100rpx;
  height: 100rpx;
  background: linear-gradient(135deg, $primary-color, $primary-dark);
  border-radius: $radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumb-placeholder {
  color: $text-white;
  font-size: $font-sm;
  font-weight: 600;
}

.project-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.project-name {
  font-size: $font-md;
  font-weight: 600;
  color: $text-primary;
}

.project-time {
  font-size: $font-xs;
  color: $text-secondary;
}

.version-info {
  text-align: center;
  font-size: $font-xs;
  color: $text-disabled;
  padding: $spacing-lg 0;
}
</style>
