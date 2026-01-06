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
  // 目标类型：1=大分区, 2=小分区, 3=评分项目, 4=合集
  targetType: TargetType
  // 目标ID（修改时必填）
  targetId?: number | null
  // 父级ID（新增小分区/评分项目时必填）
  parentId?: number | null
  // 当前名称（修改时可选，用于显示当前值）
  currentName?: string
  // 当前描述（修改时可选，用于显示当前值）
  currentDescription?: string
}

const props = withDefaults(defineProps<Props>(), {
  targetId: null,
  parentId: null,
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
  1: '大分区',
  2: '小分区',
  3: '评分项目',
  4: '合集',
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

// 是否显示图片字段（评分项目和合集支持图片）
const showImageField = computed(() => {
  return props.targetType === 3 || props.targetType === 4
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

  // 验证文件大小（最大5MB）
  if (file.size > 5 * 1024 * 1024) {
    toast.error('图片大小不能超过5MB')
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
    toast.error('请输入反馈理由')
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
          <!-- 头部 -->
          <div class="drawer-header">
            <h3>{{ drawerTitle }}</h3>
            <button class="drawer-close" @click="closeDrawer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- 内容 -->
          <div class="drawer-content">
            <p class="drawer-desc">
              <template v-if="contributionType === 2">
                填写以下信息来新增{{ targetTypeLabels[targetType] }}，提交后将由管理员审核。
              </template>
              <template v-else>
                填写以下信息来修改{{ targetTypeLabels[targetType] }}，提交后将由管理员审核。
              </template>
            </p>

            <form class="feedback-form" @submit.prevent="handleSubmit">
              <!-- 名称 -->
              <div v-if="showNameField" class="form-group">
                <label class="form-label">
                  名称 <span class="required">*</span>
                </label>
                <input
                  v-model="formData.name"
                  type="text"
                  class="form-input"
                  :placeholder="`请输入${targetTypeLabels[targetType]}名称`"
                  maxlength="50"
                />
                <div class="form-hint">
                  <span v-if="contributionType === 1 && currentName">当前：{{ currentName }}</span>
                </div>
              </div>

              <!-- 描述 -->
              <div v-if="showDescriptionField" class="form-group">
                <label class="form-label">描述</label>
                <textarea
                  v-model="formData.description"
                  class="form-textarea"
                  :placeholder="`请输入${targetTypeLabels[targetType]}描述（可选）`"
                  rows="3"
                  maxlength="500"
                ></textarea>
                <div class="form-hint">
                  <span v-if="contributionType === 1 && currentDescription">当前：{{ currentDescription }}</span>
                </div>
              </div>

              <!-- 图片 -->
              <div v-if="showImageField" class="form-group">
                <label class="form-label">图片</label>
                <div v-if="imagePreview" class="image-preview-wrapper">
                  <img :src="imagePreview" alt="预览" class="image-preview" />
                  <button type="button" class="remove-image-btn" @click="removeImage">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
                <label v-else class="image-upload-btn">
                  <input
                    type="file"
                    accept="image/*"
                    class="hidden-input"
                    @change="handleImageSelect"
                  />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <span>点击上传图片</span>
                </label>
                <div class="form-hint">支持 jpg、png 格式，最大 5MB</div>
              </div>

              <!-- 反馈理由 -->
              <div class="form-group">
                <label class="form-label">
                  反馈理由 <span class="required">*</span>
                </label>
                <textarea
                  v-model="formData.reason"
                  class="form-textarea"
                  placeholder="请说明您提交此反馈的原因，如：信息有误需要修正、发现新内容等"
                  rows="3"
                  maxlength="500"
                ></textarea>
              </div>
            </form>
          </div>

          <!-- 底部按钮 -->
          <div class="drawer-footer">
            <button class="btn-cancel" @click="closeDrawer">取消</button>
            <button
              class="btn-submit"
              :disabled="isSubmitting || isUploading"
              @click="handleSubmit"
            >
              {{ isSubmitting ? '提交中...' : isUploading ? '上传中...' : '提交反馈' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ===== Drawer ===== */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}

.drawer-container {
  width: 100%;
  max-height: 90vh;
  background: var(--color-card);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.drawer-header h3 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin: 0;
}

.drawer-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-full);
  transition: background var(--transition-fast);
}

.drawer-close:hover {
  background: var(--color-bg);
}

.drawer-close svg {
  width: 20px;
  height: 20px;
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md);
}

.drawer-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-lg);
  line-height: 1.5;
}

.drawer-footer {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

/* ===== Form ===== */
.feedback-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.form-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text);
}

.form-label .required {
  color: var(--color-error);
}

.form-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: border-color var(--transition-fast);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-textarea {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  color: var(--color-text);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  resize: vertical;
  min-height: 80px;
  transition: border-color var(--transition-fast);
  font-family: inherit;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-hint {
  font-size: var(--text-xs);
  color: var(--color-text-placeholder);
}

/* ===== Image Upload ===== */
.image-upload-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-lg);
  background: var(--color-bg);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.image-upload-btn:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.image-upload-btn svg {
  width: 32px;
  height: 32px;
  color: var(--color-text-placeholder);
}

.image-upload-btn span {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.hidden-input {
  display: none;
}

.image-preview-wrapper {
  position: relative;
  display: inline-block;
}

.image-preview {
  max-width: 100%;
  max-height: 200px;
  border-radius: var(--radius-md);
  object-fit: cover;
}

.remove-image-btn {
  position: absolute;
  top: var(--spacing-xs);
  right: var(--spacing-xs);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: var(--radius-full);
  color: white;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.remove-image-btn:hover {
  background: rgba(0, 0, 0, 0.8);
}

.remove-image-btn svg {
  width: 14px;
  height: 14px;
}

/* ===== Buttons ===== */
.btn-cancel {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text);
  background: var(--color-border);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.btn-cancel:hover {
  background: var(--color-text-placeholder);
}

.btn-submit {
  flex: 2;
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.btn-submit:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== Transitions ===== */
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.3s ease;
}

.drawer-enter-active .drawer-container,
.drawer-leave-active .drawer-container {
  transition: transform 0.3s ease;
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
    max-width: 500px;
    margin: 0 auto;
    max-height: 80vh;
  }

  .drawer-header {
    padding: var(--spacing-lg);
  }

  .drawer-content {
    padding: var(--spacing-lg);
  }

  .drawer-footer {
    padding: var(--spacing-lg);
  }
}
</style>
