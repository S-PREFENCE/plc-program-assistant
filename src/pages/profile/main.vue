<template>
  <view class="profile-container">
    <!-- 用户信息 -->
    <view class="user-section">
      <view class="user-avatar">
        <text>PLC</text>
      </view>
      <view class="user-info">
        <text class="user-name">{{ isZhCN ? 'PLC开发者' : 'PLC Developer' }}</text>
        <text class="user-tag">{{ isZhCN ? '梯形图编程' : 'Ladder Programming' }}</text>
      </view>
    </view>

    <!-- 设置列表 -->
    <view class="settings-section">
      <view class="section-title">{{ isZhCN ? '设置' : 'Settings' }}</view>
      
      <view class="setting-item" @tap="showLanguagePicker">
        <view class="setting-left">
          <text class="setting-icon">🌐</text>
          <text class="setting-name">{{ isZhCN ? '语言' : 'Language' }}</text>
        </view>
        <view class="setting-right">
          <text class="setting-value">{{ isZhCN ? '中文' : 'English' }}</text>
          <text class="setting-arrow">></text>
        </view>
      </view>

      <view class="setting-item">
        <view class="setting-left">
          <text class="setting-icon">⏱️</text>
          <text class="setting-name">{{ isZhCN ? '扫描周期' : 'Scan Time' }}</text>
        </view>
        <picker :value="scanTimeIndex" :range="scanTimeOptions" @change="onScanTimeChange">
          <view class="setting-right">
            <text class="setting-value">{{ scanTimeOptions[scanTimeIndex] }}ms</text>
            <text class="setting-arrow">></text>
          </view>
        </picker>
      </view>

      <view class="setting-item" @tap="toggleGrid">
        <view class="setting-left">
          <text class="setting-icon">⊞</text>
          <text class="setting-name">{{ isZhCN ? '显示网格' : 'Show Grid' }}</text>
        </view>
        <view class="setting-right">
          <switch :checked="settingsStore.gridEnabled" @change="toggleGrid" color="#00BCD4" />
        </view>
      </view>

      <view class="setting-item" @tap="toggleAutoSave">
        <view class="setting-left">
          <text class="setting-icon">💾</text>
          <text class="setting-name">{{ isZhCN ? '自动保存' : 'Auto Save' }}</text>
        </view>
        <view class="setting-right">
          <switch :checked="settingsStore.autoSave" @change="toggleAutoSave" color="#00BCD4" />
        </view>
      </view>
    </view>

    <!-- 变量表 -->
    <view class="variables-section">
      <view class="section-header">
        <text class="section-title">{{ isZhCN ? '变量表' : 'Variable Table' }}</text>
        <view class="section-action" @tap="showAddVariable">
          <text>+ {{ isZhCN ? '添加' : 'Add' }}</text>
        </view>
      </view>

      <!-- 变量表头部 -->
      <view class="var-table-header">
        <text class="col-addr">{{ isZhCN ? '地址' : 'Address' }}</text>
        <text class="col-symbol">{{ isZhCN ? '符号' : 'Symbol' }}</text>
        <text class="col-type">{{ isZhCN ? '类型' : 'Type' }}</text>
        <text class="col-action"></text>
      </view>

      <!-- 变量列表 -->
      <view class="var-table-body">
        <view 
          class="var-row" 
          v-for="variable in variables" 
          :key="variable.id"
          @tap="editVariable(variable)"
        >
          <text class="col-addr">{{ variable.address }}</text>
          <text class="col-symbol">{{ variable.symbol || '-' }}</text>
          <text class="col-type">{{ variable.dataType }}</text>
          <view class="col-action" @tap.stop="deleteVariable(variable.id)">
            <text class="delete-btn">×</text>
          </view>
        </view>
        
        <view class="var-empty" v-if="variables.length === 0">
          <text>{{ isZhCN ? '暂无变量，点击添加' : 'No variables, tap to add' }}</text>
        </view>
      </view>
    </view>

    <!-- 关于 -->
    <view class="about-section">
      <view class="section-title">{{ isZhCN ? '关于' : 'About' }}</view>
      
      <view class="about-item">
        <text class="about-label">{{ isZhCN ? '版本' : 'Version' }}</text>
        <text class="about-value">v1.0.0</text>
      </view>
      
      <view class="about-item">
        <text class="about-label">{{ isZhCN ? '技术框架' : 'Framework' }}</text>
        <text class="about-value">uni-app + Canvas</text>
      </view>
      
      <view class="about-item">
        <text class="about-label">{{ isZhCN ? 'PLC标准' : 'PLC Standard' }}</text>
        <text class="about-value">IEC 61131-3</text>
      </view>
    </view>

    <!-- TabBar占位 -->
    <view class="tab-bar-placeholder"></view>

    <!-- 添加变量弹窗 -->
    <view class="modal-mask" v-if="showVariableModal" @tap="closeVariableModal">
      <view class="variable-modal" @tap.stop>
        <view class="modal-header">
          <text class="modal-title">{{ editingVariable ? (isZhCN ? '编辑变量' : 'Edit Variable') : (isZhCN ? '添加变量' : 'Add Variable') }}</text>
          <text class="modal-close" @tap="closeVariableModal">×</text>
        </view>
        <view class="modal-body">
          <view class="form-item">
            <text class="form-label">{{ isZhCN ? '地址' : 'Address' }}</text>
            <input class="form-input" v-model="variableForm.address" placeholder="如: I0.0, Q0.1, MB10" />
          </view>
          <view class="form-item">
            <text class="form-label">{{ isZhCN ? '符号名' : 'Symbol' }}</text>
            <input class="form-input" v-model="variableForm.symbol" :placeholder="isZhCN ? '如: 启动按钮' : 'e.g. Start Button'" />
          </view>
          <view class="form-item">
            <text class="form-label">{{ isZhCN ? '数据类型' : 'Data Type' }}</text>
            <picker :value="dataTypeIndex" :range="dataTypes" @change="onDataTypeChange">
              <view class="picker-value">{{ dataTypes[dataTypeIndex] }}</view>
            </picker>
          </view>
          <view class="form-item">
            <text class="form-label">{{ isZhCN ? '注释' : 'Comment' }}</text>
            <input class="form-input" v-model="variableForm.comment" :placeholder="isZhCN ? '可选' : 'Optional'" />
          </view>
          <view class="form-item checkbox">
            <switch :checked="variableForm.retain" @change="variableForm.retain = !variableForm.retain" color="#00BCD4" />
            <text class="checkbox-label">{{ isZhCN ? '掉电保持' : 'Retain' }}</text>
          </view>
        </view>
        <view class="modal-footer">
          <button class="btn-secondary" @tap="closeVariableModal">{{ isZhCN ? '取消' : 'Cancel' }}</button>
          <button class="btn-primary" @tap="saveVariable">{{ isZhCN ? '确定' : 'OK' }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useProjectStore, type Variable } from '@/store/project'
import { useSettingsStore } from '@/store/settings'

const projectStore = useProjectStore()
const settingsStore = useSettingsStore()

// 计算属性
const isZhCN = computed(() => settingsStore.isZhCN)
const variables = computed(() => projectStore.currentProject?.variables || [])

const scanTimeOptions = [10, 20, 50, 100]
const scanTimeIndex = ref(scanTimeOptions.indexOf(settingsStore.scanTime) || 1)

const dataTypes = ['BOOL', 'BYTE', 'WORD', 'DWORD', 'INT', 'DINT', 'REAL']
const dataTypeIndex = ref(0)

// 变量弹窗
const showVariableModal = ref(false)
const editingVariable = ref<Variable | null>(null)
const variableForm = reactive({
  address: '',
  symbol: '',
  dataType: 'BOOL',
  comment: '',
  retain: false
})

function showLanguagePicker() {
  uni.showActionSheet({
    itemList: ['中文', 'English'],
    success: (res) => {
      if (res.tapIndex === 0 && !settingsStore.isZhCN) {
        settingsStore.toggleLanguage()
      } else if (res.tapIndex === 1 && settingsStore.isZhCN) {
        settingsStore.toggleLanguage()
      }
    }
  })
}

function onScanTimeChange(e: any) {
  const index = e.detail.value
  scanTimeIndex.value = index
  settingsStore.setScanTime(scanTimeOptions[index])
}

function toggleGrid() {
  settingsStore.gridEnabled = !settingsStore.gridEnabled
  settingsStore.saveSettings()
}

function toggleAutoSave() {
  settingsStore.autoSave = !settingsStore.autoSave
  settingsStore.saveSettings()
}

function showAddVariable() {
  editingVariable.value = null
  variableForm.address = ''
  variableForm.symbol = ''
  variableForm.dataType = 'BOOL'
  variableForm.comment = ''
  variableForm.retain = false
  dataTypeIndex.value = 0
  showVariableModal.value = true
}

function editVariable(variable: Variable) {
  editingVariable.value = variable
  variableForm.address = variable.address
  variableForm.symbol = variable.symbol
  variableForm.dataType = variable.dataType
  variableForm.comment = variable.comment
  variableForm.retain = variable.retain
  dataTypeIndex.value = dataTypes.indexOf(variable.dataType)
  showVariableModal.value = true
}

function onDataTypeChange(e: any) {
  dataTypeIndex.value = e.detail.value
  variableForm.dataType = dataTypes[dataTypeIndex.value]
}

function closeVariableModal() {
  showVariableModal.value = false
  editingVariable.value = null
}

function saveVariable() {
  if (!variableForm.address.trim()) {
    uni.showToast({ title: isZhCN.value ? '请输入地址' : 'Enter address', icon: 'none' })
    return
  }
  
  if (!projectStore.currentProject) {
    uni.showToast({ title: isZhCN.value ? '请先打开项目' : 'Open a project first', icon: 'none' })
    return
  }
  
  // 解析地址区域
  let dataArea: 'I' | 'Q' | 'M' | 'DB' = 'I'
  const addr = variableForm.address.toUpperCase()
  if (addr.startsWith('I') || addr.startsWith('I')) dataArea = 'I'
  else if (addr.startsWith('Q')) dataArea = 'Q'
  else if (addr.startsWith('M')) dataArea = 'M'
  else if (addr.startsWith('DB')) dataArea = 'DB'
  
  const variable: Variable = {
    id: editingVariable.value?.id || 'var_' + Date.now(),
    address: variableForm.address,
    symbol: variableForm.symbol,
    dataArea,
    dataType: variableForm.dataType as any,
    comment: variableForm.comment,
    retain: variableForm.retain,
    initialValue: variableForm.dataType === 'BOOL' ? false : 0
  }
  
  if (editingVariable.value) {
    projectStore.updateVariable(editingVariable.value.id, variable)
  } else {
    projectStore.addVariable(variable)
  }
  
  closeVariableModal()
  uni.showToast({ title: isZhCN.value ? '保存成功' : 'Saved', icon: 'success' })
}

function deleteVariable(id: string) {
  uni.showModal({
    title: isZhCN.value ? '确认删除' : 'Confirm Delete',
    content: isZhCN.value ? '确定要删除该变量吗？' : 'Delete this variable?',
    success: (res) => {
      if (res.confirm) {
        projectStore.deleteVariable(id)
      }
    }
  })
}
</script>

<style lang="scss" scoped>
@import '@/styles/common.scss';

.profile-container {
  min-height: 100vh;
  background: $bg-page;
  padding: $spacing-md;
  padding-bottom: 200rpx;
}

.user-section {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-lg;
  background: $bg-card;
  border-radius: $radius-md;
  margin-bottom: $spacing-lg;
}

.user-avatar {
  width: 100rpx;
  height: 100rpx;
  background: linear-gradient(135deg, $primary-color, $primary-dark);
  border-radius: $radius-full;
  display: flex;
  align-items: center;
  justify-content: center;
  
  text {
    color: $text-white;
    font-size: $font-lg;
    font-weight: 600;
  }
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: $font-lg;
  font-weight: 600;
  color: $text-primary;
}

.user-tag {
  font-size: $font-sm;
  color: $text-secondary;
}

.settings-section,
.variables-section,
.about-section {
  background: $bg-card;
  border-radius: $radius-md;
  padding: $spacing-md;
  margin-bottom: $spacing-md;
}

.section-title {
  font-size: $font-md;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: $spacing-md;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-md;
}

.section-action {
  color: $primary-color;
  font-size: $font-sm;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-sm 0;
  border-bottom: 1rpx solid $border-light;
  
  &:last-child {
    border-bottom: none;
  }
}

.setting-left {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.setting-icon {
  font-size: $font-lg;
}

.setting-name {
  font-size: $font-md;
  color: $text-primary;
}

.setting-right {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.setting-value {
  font-size: $font-sm;
  color: $text-secondary;
}

.setting-arrow {
  color: $text-disabled;
  font-size: $font-sm;
}

.var-table-header {
  display: flex;
  padding: $spacing-sm 0;
  border-bottom: 1rpx solid $border-color;
  font-size: $font-xs;
  color: $text-secondary;
  font-weight: 600;
}

.var-table-body {
  max-height: 400rpx;
  overflow-y: auto;
}

.var-row {
  display: flex;
  padding: $spacing-sm 0;
  border-bottom: 1rpx solid $border-light;
  
  &:active {
    background: $bg-panel;
  }
}

.var-empty {
  padding: $spacing-xl;
  text-align: center;
  color: $text-disabled;
  font-size: $font-sm;
}

.col-addr {
  flex: 2;
  font-size: $font-sm;
  color: $primary-color;
  font-family: monospace;
}

.col-symbol {
  flex: 3;
  font-size: $font-sm;
  color: $text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-type {
  flex: 1.5;
  font-size: $font-xs;
  color: $text-secondary;
}

.col-action {
  flex: 0.5;
  text-align: center;
}

.delete-btn {
  display: inline-block;
  width: 40rpx;
  height: 40rpx;
  line-height: 40rpx;
  text-align: center;
  color: $error-color;
  font-size: $font-lg;
}

.about-item {
  display: flex;
  justify-content: space-between;
  padding: $spacing-sm 0;
  border-bottom: 1rpx solid $border-light;
  
  &:last-child {
    border-bottom: none;
  }
}

.about-label {
  font-size: $font-sm;
  color: $text-secondary;
}

.about-value {
  font-size: $font-sm;
  color: $text-primary;
}

.tab-bar-placeholder {
  height: 100rpx;
}

.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.variable-modal {
  width: 100%;
  max-width: 600rpx;
  background: $bg-card;
  border-radius: $radius-lg $radius-lg 0 0;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $spacing-md;
  border-bottom: 1rpx solid $border-color;
}

.modal-title {
  font-size: $font-lg;
  font-weight: 600;
  color: $text-primary;
}

.modal-close {
  font-size: $font-xxl;
  color: $text-secondary;
  line-height: 1;
}

.modal-body {
  padding: $spacing-md;
}

.form-item {
  margin-bottom: $spacing-md;
  
  &.checkbox {
    display: flex;
    align-items: center;
    gap: $spacing-sm;
  }
}

.checkbox-label {
  font-size: $font-md;
  color: $text-primary;
}

.form-label {
  display: block;
  font-size: $font-sm;
  color: $text-secondary;
  margin-bottom: $spacing-xs;
}

.form-input {
  width: 100%;
  padding: $spacing-sm $spacing-md;
  background: $bg-input;
  border: 1rpx solid $border-color;
  border-radius: $radius-sm;
  font-size: $font-md;
}

.picker-value {
  padding: $spacing-sm $spacing-md;
  background: $bg-input;
  border: 1rpx solid $border-color;
  border-radius: $radius-sm;
  font-size: $font-md;
}

.modal-footer {
  display: flex;
  gap: $spacing-md;
  padding: $spacing-md;
  border-top: 1rpx solid $border-color;
}

.btn-primary, .btn-secondary {
  flex: 1;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-sm;
  font-size: $font-md;
  text-align: center;
}

.btn-primary {
  background: $primary-color;
  color: $text-white;
}

.btn-secondary {
  background: $bg-input;
  color: $text-primary;
}
</style>
