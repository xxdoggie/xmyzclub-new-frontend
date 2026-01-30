<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useToast } from '@/composables/useToast'
import { useUserStore } from '@/stores/user'
import { submitContribution, uploadContributionImage } from '@/api/rating'
import type { ContributionType, TargetType, ContributionDetail } from '@/types/rating'

// Props
interface Props {
  isOpen: boolean
  // 贡献类型：1=修改现有, 2=新增
  contributionType: ContributionType
  // 目标类型：1=分类, 2=评分项目, 3=合集
  targetType: TargetType
  // 目标ID（修改时必填）
  targetId?: number | null
  // 父级ID（新增子分类/评分项目时必填，新增顶级分类时为 null）
  parentId?: number | null
  // 学校ID（新建分类时必填）
  schoolId?: number | null
  // 父级路径（新增时显示完整层级，如 "食堂 > 二楼"）
  parentPath?: string
  // 当前名称（修改时可选，用于显示当前值）
  currentName?: string
  // 当前描述（修改时可选，用于显示当前值）
  currentDescription?: string
}

const props = withDefaults(defineProps<Props>(), {
  targetId: null,
  parentId: null,
  schoolId: null,
  parentPath: '',
  currentName: '',
  currentDescription: '',
})

const emit = defineEmits<{
  close: []
  success: []
}>()

const toast = useToast()
const userStore = useUserStore()

// 表单状态
const formData = ref({
  name: '',
  description: '',
  reason: '',
})
const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
const uploadedFileId = ref<number | null>(null)

// 提交状态
const isSubmitting = ref(false)
const isUploading = ref(false)

// 目标类型显示文本
const targetTypeLabels: Record<TargetType, string> = {
  1: '分类',
  2: '评分项目',
  3: '合集',
}

// 贡献类型显示文本
const contributionTypeLabels: Record<ContributionType, string> = {
  1: '修改',
  2: '新增',
}

// 标题
const drawerTitle = computed(() => {
  return `${contributionTypeLabels[props.contributionType]}${targetTypeLabels[props.targetType]}`
})

// 是否显示名称字段
const showNameField = computed(() => true)

// 是否显示描述字段
const showDescriptionField = computed(() => true)

// 是否显示图片字段（新增时所有类型都支持图片，修改时评分项目和合集支持）
const showImageField = computed(() => {
  // 新增时：分类、评分项目、合集都支持图片
  if (props.contributionType === 2) {
    return true
  }
  // 修改时：仅评分项目和合集支持图片
  return props.targetType === 2 || props.targetType === 3
})

// 是否为新增模式
const isAddMode = computed(() => props.contributionType === 2)

// 理由字段的标签文本
const reasonLabel = computed(() => isAddMode.value ? '新增说明' : '修改理由')

// 理由字段的占位符
const reasonPlaceholder = computed(() => {
  if (isAddMode.value) {
    return `请简要说明为什么要新增这个${targetTypeLabels[props.targetType]}，例如：在该分类下缺少此内容`
  }
  return '请说明您提交此修改的原因，如：信息有误需要修正、描述不准确等'
})

// 提交按钮文本
const submitButtonText = computed(() => {
  if (isSubmitting.value) return '提交中...'
  if (isUploading.value) return '上传中...'
  return isAddMode.value ? '提交申请' : '提交反馈'
})

// 重置表单
function resetForm() {
  formData.value = {
    name: props.contributionType === 1 ? props.currentName : '',
    description: props.contributionType === 1 ? props.currentDescription : '',
    reason: '',
  }
  imageFile.value = null
  imagePreview.value = null
  uploadedFileId.value = null
}

// 监听打开状态
watch(() => props.isOpen, (open) => {
  if (open) {
    resetForm()
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

// 关闭抽屉
function closeDrawer() {
  emit('close')
}

// 处理图片选择
function handleImageSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    toast.error('请选择图片文件')
    return
  }

  // 验证文件大小（最大20MB）
  if (file.size > 20 * 1024 * 1024) {
    toast.error('图片大小不能超过 20MB')
    return
  }

  imageFile.value = file
  // 创建预览
  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

// 移除图片
function removeImage() {
  imageFile.value = null
  imagePreview.value = null
  uploadedFileId.value = null
}

// 上传图片
async function uploadImage(): Promise<number | null> {
  if (!imageFile.value) return null

  isUploading.value = true
  try {
    const res = await uploadContributionImage(imageFile.value)
    if (res.data.code === 200) {
      return res.data.data.id
    } else {
      toast.error(res.data.message || '图片上传失败')
      return null
    }
  } catch {
    toast.error('图片上传失败')
    return null
  } finally {
    isUploading.value = false
  }
}

// 验证表单
function validateForm(): boolean {
  if (!formData.value.name.trim()) {
    toast.error('请输入名称')
    return false
  }
  if (!formData.value.reason.trim()) {
    toast.error(isAddMode.value ? '请填写新增说明' : '请填写修改理由')
    return false
  }
  return true
}

// 提交表单
async function handleSubmit() {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal()
    return
  }

  if (!validateForm()) return

  isSubmitting.value = true
  try {
    // 如果有图片，先上传
    let fileId: number | null = null
    if (imageFile.value) {
      fileId = await uploadImage()
      if (imageFile.value && !fileId) {
        // 图片上传失败
        isSubmitting.value = false
        return
      }
    }

    // 构建详情
    const details: ContributionDetail[] = []

    // 添加名称字段
    if (formData.value.name.trim()) {
      details.push({
        fieldName: 'name',
        newValue: formData.value.name.trim(),
      })
    }

    // 添加描述字段
    if (formData.value.description.trim()) {
      details.push({
        fieldName: 'description',
        newValue: formData.value.description.trim(),
      })
    }

    // 添加图片字段
    if (fileId) {
      details.push({
        fieldName: 'image',
        newValue: String(fileId),
      })
    }

    // 提交请求
    const res = await submitContribution({
      contributionType: props.contributionType,
      targetType: props.targetType,
      targetId: props.contributionType === 1 ? props.targetId : null,
      parentId: props.contributionType === 2 ? props.parentId : null,
      schoolId: props.contributionType === 2 && props.targetType === 1 ? props.schoolId : null,
      reason: formData.value.reason.trim(),
      details,
    })

    if (res.data.code === 200) {
      toast.success('提交成功，等待审核')
      emit('success')
      closeDrawer()
    } else {
      toast.error(res.data.message || '提交失败')
    }
  } catch {
    toast.error('提交失败')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="isOpen" class="drawer-overlay" @click="closeDrawer">
        <div class="drawer-container" @click.stop>
          <!-- 头部 - 更活泼的设计 -->
          <div class="drawer-header">
            <div class="drawer-header-content">
              <div class="drawer-icon">
                <svg v-if="isAddMode" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </div>
              <div class="drawer-title-group">
                <h3>{{ drawerTitle }}</h3>
                <p class="drawer-subtitle">
                  <template v-if="isAddMode">为社区添加新内容</template>
                  <template v-else>帮助完善社区信息</template>
                </p>
              </div>
            </div>
            <button class="drawer-close" @click="closeDrawer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- 内容 -->
          <div class="drawer-content">
            <!-- 新增时显示父级路径 - 更友好的卡片样式 -->
            <div v-if="isAddMode && parentPath" class="parent-path-card">
              <div class="path-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <div class="path-text">
                <span class="path-label">添加位置</span>
                <span class="path-value">{{ parentPath }}</span>
              </div>
            </div>

            <form class="feedback-form" @submit.prevent="handleSubmit">
              <!-- 名称 - 更现代的输入框 -->
              <div v-if="showNameField" class="form-group">
                <div class="form-label-row">
                  <label class="form-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 7V4h16v3"></path>
                      <path d="M9 20h6"></path>
                      <path d="M12 4v16"></path>
                    </svg>
                    名称
                  </label>
                  <span class="form-required">必填</span>
                </div>
                <div class="input-wrapper">
                  <input
                    v-model="formData.name"
                    type="text"
                    class="form-input"
                    :placeholder="`给这个${targetTypeLabels[targetType]}起个名字吧`"
                    maxlength="50"
                  />
                </div>
                <div v-if="contributionType === 1 && currentName" class="form-current">
                  <span class="current-label">当前名称</span>
                  <span class="current-value">{{ currentName }}</span>
                </div>
              </div>

              <!-- 描述 - 更舒适的文本域 -->
              <div v-if="showDescriptionField" class="form-group">
                <div class="form-label-row">
                  <label class="form-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="17" y1="10" x2="3" y2="10"></line>
                      <line x1="21" y1="6" x2="3" y2="6"></line>
                      <line x1="21" y1="14" x2="3" y2="14"></line>
                      <line x1="17" y1="18" x2="3" y2="18"></line>
                    </svg>
                    描述
                  </label>
                  <span class="form-optional">选填</span>
                </div>
                <div class="textarea-wrapper">
                  <textarea
                    v-model="formData.description"
                    class="form-textarea"
                    :placeholder="`简单介绍一下这个${targetTypeLabels[targetType]}~`"
                    rows="3"
                    maxlength="500"
                  ></textarea>
                </div>
                <div v-if="contributionType === 1 && currentDescription" class="form-current">
                  <span class="current-label">当前描述</span>
                  <span class="current-value">{{ currentDescription }}</span>
                </div>
              </div>

              <!-- 图片 - 更有趣的上传区域 -->
              <div v-if="showImageField" class="form-group">
                <div class="form-label-row">
                  <label class="form-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    配图
                  </label>
                  <span class="form-optional">选填</span>
                </div>
                <div v-if="imagePreview" class="image-preview-card">
                  <img :src="imagePreview" alt="预览" class="image-preview" />
                  <button type="button" class="remove-image-btn" @click="removeImage">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    <span>移除</span>
                  </button>
                </div>
                <label v-else class="image-upload-area">
                  <input
                    type="file"
                    accept="image/*"
                    class="hidden-input"
                    @change="handleImageSelect"
                  />
                  <div class="upload-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                  </div>
                  <span class="upload-text">点击或拖拽上传图片</span>
                  <span class="upload-hint">JPG / PNG / GIF / WebP，最大 20MB</span>
                </label>
              </div>

              <!-- 理由/说明 - 更友好的提示 -->
              <div class="form-group">
                <div class="form-label-row">
                  <label class="form-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    {{ reasonLabel }}
                  </label>
                  <span class="form-required">必填</span>
                </div>
                <div class="textarea-wrapper">
                  <textarea
                    v-model="formData.reason"
                    class="form-textarea"
                    :placeholder="isAddMode ? '告诉我们为什么要添加这个内容~' : '简单说明一下修改的原因~'"
                    rows="3"
                    maxlength="500"
                  ></textarea>
                </div>
                <div class="form-tip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                    <path d="M12 16v-4"></path>
                    <path d="M12 8h.01"></path>
                  </svg>
                  <span>提交后将由管理员审核，通过后即可生效</span>
                </div>
              </div>
            </form>
          </div>

          <!-- 底部按钮 - 更圆润活泼 -->
          <div class="drawer-footer">
            <button class="btn-secondary" @click="closeDrawer">
              <span>下次再说</span>
            </button>
            <button
              class="btn-primary"
              :disabled="isSubmitting || isUploading"
              @click="handleSubmit"
            >
              <svg v-if="!isSubmitting && !isUploading" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 2L11 13"></path>
                <path d="M22 2l-7 20-4-9-9-4 20-7z"></path>
              </svg>
              <span v-if="isSubmitting || isUploading" class="loading-dots">
                <span></span><span></span><span></span>
              </span>
              <span v-else>{{ isAddMode ? '提交申请' : '提交反馈' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ===== Drawer Overlay ===== */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

/* ===== Drawer Container ===== */
.drawer-container {
  width: 100%;
  max-height: 92vh;
  background: var(--color-card);
  border-radius: 24px 24px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.12);
}

/* ===== Header - 活力风格 ===== */
.drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: var(--spacing-lg) var(--spacing-lg) var(--spacing-md);
  background: linear-gradient(135deg, var(--color-primary-bg) 0%, transparent 100%);
  flex-shrink: 0;
}

.drawer-header-content {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
}

.drawer-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  flex-shrink: 0;
}

.drawer-icon svg {
  width: 28px;
  height: 28px;
}

.drawer-title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 2px;
}

.drawer-header h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin: 0;
  color: var(--color-text);
}

.drawer-subtitle {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.drawer-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: var(--color-bg);
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.drawer-close:hover {
  background: var(--color-border);
  transform: rotate(90deg);
}

.drawer-close svg {
  width: 18px;
  height: 18px;
}

/* ===== Content ===== */
.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md) var(--spacing-lg) var(--spacing-lg);
}

/* ===== 父级路径卡片 ===== */
.parent-path-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 14px;
  margin-bottom: var(--spacing-lg);
}

.path-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 10px;
  color: #0ea5e9;
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.15);
}

.path-icon svg {
  width: 18px;
  height: 18px;
}

.path-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.path-label {
  font-size: var(--text-xs);
  color: #0369a1;
}

.path-value {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: #0c4a6e;
}

/* ===== Form ===== */
.feedback-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text);
}

.form-label svg {
  width: 16px;
  height: 16px;
  color: var(--color-text-secondary);
}

.form-required {
  font-size: 11px;
  font-weight: var(--font-medium);
  color: white;
  background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
  padding: 2px 8px;
  border-radius: 20px;
}

.form-optional {
  font-size: 11px;
  font-weight: var(--font-medium);
  color: var(--color-text-placeholder);
  background: var(--color-bg);
  padding: 2px 8px;
  border-radius: 20px;
}

/* ===== Input Wrapper ===== */
.input-wrapper,
.textarea-wrapper {
  position: relative;
}

.form-input {
  width: 100%;
  padding: 14px 16px;
  font-size: var(--text-sm);
  color: var(--color-text);
  background: var(--color-bg);
  border: 2px solid transparent;
  border-radius: 14px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.form-input:hover {
  background: var(--color-card);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.form-input:focus {
  outline: none;
  background: var(--color-card);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px var(--color-primary-bg);
}

.form-input::placeholder {
  color: var(--color-text-placeholder);
}

.form-textarea {
  width: 100%;
  padding: 14px 16px;
  font-size: var(--text-sm);
  color: var(--color-text);
  background: var(--color-bg);
  border: 2px solid transparent;
  border-radius: 14px;
  resize: none;
  min-height: 100px;
  transition: all 0.2s ease;
  font-family: inherit;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.form-textarea:hover {
  background: var(--color-card);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.form-textarea:focus {
  outline: none;
  background: var(--color-card);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 4px var(--color-primary-bg);
}

.form-textarea::placeholder {
  color: var(--color-text-placeholder);
}

/* ===== Current Value Display ===== */
.form-current {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  background: var(--color-bg);
  border-radius: 8px;
  font-size: var(--text-xs);
}

.current-label {
  color: var(--color-text-placeholder);
}

.current-value {
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
}

/* ===== Form Tip ===== */
.form-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
  margin-top: var(--spacing-sm);
}

.form-tip svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

/* ===== Image Upload ===== */
.image-upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xl);
  background: linear-gradient(135deg, var(--color-bg) 0%, var(--color-card) 100%);
  border: 2px dashed var(--color-border);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.image-upload-area:hover {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, var(--color-primary-bg) 0%, var(--color-card) 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.upload-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary-bg) 0%, #ede9fe 100%);
  border-radius: 16px;
  color: var(--color-primary);
}

.upload-icon svg {
  width: 28px;
  height: 28px;
}

.upload-text {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text);
}

.upload-hint {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

.hidden-input {
  display: none;
}

/* ===== Image Preview ===== */
.image-preview-card {
  position: relative;
  display: inline-block;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.image-preview {
  max-width: 100%;
  max-height: 200px;
  display: block;
  object-fit: cover;
}

.remove-image-btn {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  border: none;
  border-radius: 20px;
  color: white;
  font-size: var(--text-xs);
  cursor: pointer;
  transition: all 0.2s ease;
}

.remove-image-btn:hover {
  background: rgba(239, 68, 68, 0.9);
}

.remove-image-btn svg {
  width: 14px;
  height: 14px;
}

/* ===== Footer ===== */
.drawer-footer {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  padding-bottom: max(var(--spacing-lg), env(safe-area-inset-bottom));
  background: var(--color-card);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

/* ===== Buttons - 轻量风格 ===== */
.btn-secondary {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.btn-primary {
  flex: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-primary);
  background: var(--color-primary-bg);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary svg {
  width: 16px;
  height: 16px;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary);
  color: white;
}

.btn-primary:active:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== Loading Dots ===== */
.loading-dots {
  display: flex;
  align-items: center;
  gap: 4px;
}

.loading-dots span {
  width: 5px;
  height: 5px;
  background: var(--color-primary);
  border-radius: 50%;
  animation: loading-bounce 1.4s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes loading-bounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

/* ===== Transitions ===== */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.3s ease;
}

.drawer-enter-active .drawer-container,
.drawer-leave-active .drawer-container {
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .drawer-container,
.drawer-leave-to .drawer-container {
  transform: translateY(100%);
}

/* ===== Desktop ===== */
@media (min-width: 1024px) {
  .drawer-container {
    max-width: 480px;
    margin: 0 auto;
    max-height: 85vh;
    border-radius: 28px 28px 0 0;
  }

  .drawer-header {
    padding: var(--spacing-xl) var(--spacing-xl) var(--spacing-md);
  }

  .drawer-icon svg {
    width: 32px;
    height: 32px;
  }

  .drawer-content {
    padding: var(--spacing-md) var(--spacing-xl) var(--spacing-xl);
  }

  .drawer-footer {
    padding: var(--spacing-lg) var(--spacing-xl);
  }

  .form-input,
  .form-textarea {
    padding: 16px 18px;
  }

  .btn-secondary,
  .btn-primary {
    padding: 14px var(--spacing-lg);
  }
}
</style>
