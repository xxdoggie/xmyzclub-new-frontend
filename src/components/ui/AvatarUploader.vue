<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { uploadAvatar, deleteAvatar } from '@/api/user'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  show: boolean
  currentAvatar?: string
}>()

const emit = defineEmits<{
  close: []
  uploaded: [avatarUrl: string]
  deleted: []
}>()

const toast = useToast()

// 状态
const fileInput = ref<HTMLInputElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const selectedFile = ref<File | null>(null)
const imageUrl = ref<string | null>(null)
const isUploading = ref(false)
const isDeleting = ref(false)

// 裁剪相关状态
const image = ref<HTMLImageElement | null>(null)
const scale = ref(1)
const minScale = ref(0.1)
const maxScale = ref(3)
const offsetX = ref(0)
const offsetY = ref(0)
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragStartOffsetX = ref(0)
const dragStartOffsetY = ref(0)

// 裁剪区域大小（固定为 200x200）
const cropSize = 200
const canvasSize = 300

// 是否显示裁剪界面
const showCropper = computed(() => !!imageUrl.value)

// 选择文件
function triggerFileSelect() {
  fileInput.value?.click()
}

// 文件选择变化
function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // 验证文件类型
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
  if (!validTypes.includes(file.type)) {
    toast.error('请选择有效的图片文件（JPEG, PNG, GIF, WebP, BMP）')
    return
  }

  // 验证文件大小（10MB）
  if (file.size > 10 * 1024 * 1024) {
    toast.error('图片大小不能超过 10MB')
    return
  }

  selectedFile.value = file
  loadImage(file)
}

// 加载图片
function loadImage(file: File) {
  const reader = new FileReader()
  reader.onload = (e) => {
    const url = e.target?.result as string
    imageUrl.value = url

    const img = new Image()
    img.onload = () => {
      image.value = img
      // 计算初始缩放，使图片能够填充裁剪区域
      const scaleX = cropSize / img.width
      const scaleY = cropSize / img.height
      scale.value = Math.max(scaleX, scaleY)
      minScale.value = Math.max(scaleX, scaleY) * 0.5
      maxScale.value = Math.max(scaleX, scaleY) * 4
      offsetX.value = 0
      offsetY.value = 0
      drawCanvas()
    }
    img.src = url
  }
  reader.readAsDataURL(file)
}

// 绘制 Canvas
function drawCanvas() {
  const canvas = canvasRef.value
  const img = image.value
  if (!canvas || !img) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 清空画布
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, canvasSize, canvasSize)

  // 计算图片绘制位置
  const scaledWidth = img.width * scale.value
  const scaledHeight = img.height * scale.value
  const x = (canvasSize - scaledWidth) / 2 + offsetX.value
  const y = (canvasSize - scaledHeight) / 2 + offsetY.value

  // 绘制图片
  ctx.drawImage(img, x, y, scaledWidth, scaledHeight)

  // 绘制裁剪框外的半透明遮罩
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  const cropX = (canvasSize - cropSize) / 2
  const cropY = (canvasSize - cropSize) / 2

  // 上方遮罩
  ctx.fillRect(0, 0, canvasSize, cropY)
  // 下方遮罩
  ctx.fillRect(0, cropY + cropSize, canvasSize, cropY)
  // 左侧遮罩
  ctx.fillRect(0, cropY, cropX, cropSize)
  // 右侧遮罩
  ctx.fillRect(cropX + cropSize, cropY, cropX, cropSize)

  // 绘制裁剪框边框
  ctx.strokeStyle = 'white'
  ctx.lineWidth = 2
  ctx.strokeRect(cropX, cropY, cropSize, cropSize)

  // 绘制圆形参考线
  ctx.beginPath()
  ctx.arc(canvasSize / 2, canvasSize / 2, cropSize / 2, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.lineWidth = 1
  ctx.stroke()
}

// 鼠标/触摸事件处理
function onPointerDown(event: PointerEvent) {
  isDragging.value = true
  dragStartX.value = event.clientX
  dragStartY.value = event.clientY
  dragStartOffsetX.value = offsetX.value
  dragStartOffsetY.value = offsetY.value
  ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!isDragging.value) return

  const deltaX = event.clientX - dragStartX.value
  const deltaY = event.clientY - dragStartY.value

  offsetX.value = dragStartOffsetX.value + deltaX
  offsetY.value = dragStartOffsetY.value + deltaY

  drawCanvas()
}

function onPointerUp() {
  isDragging.value = false
}

// 滚轮缩放
function onWheel(event: WheelEvent) {
  event.preventDefault()
  const delta = event.deltaY > 0 ? -0.1 : 0.1
  const newScale = Math.min(maxScale.value, Math.max(minScale.value, scale.value + delta))
  scale.value = newScale
  drawCanvas()
}

// 滑块缩放
function onScaleChange(event: Event) {
  const target = event.target as HTMLInputElement
  scale.value = parseFloat(target.value)
  drawCanvas()
}

// 裁剪图片
function cropImage(): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = image.value
    if (!img) {
      reject(new Error('No image'))
      return
    }

    // 创建临时 canvas 用于裁剪
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = cropSize
    tempCanvas.height = cropSize
    const ctx = tempCanvas.getContext('2d')
    if (!ctx) {
      reject(new Error('Cannot get canvas context'))
      return
    }

    // 计算裁剪区域在原图中的位置
    const scaledWidth = img.width * scale.value
    const scaledHeight = img.height * scale.value
    const imgX = (canvasSize - scaledWidth) / 2 + offsetX.value
    const imgY = (canvasSize - scaledHeight) / 2 + offsetY.value
    const cropX = (canvasSize - cropSize) / 2
    const cropY = (canvasSize - cropSize) / 2

    // 计算源图片中对应的区域
    const sourceX = (cropX - imgX) / scale.value
    const sourceY = (cropY - imgY) / scale.value
    const sourceWidth = cropSize / scale.value
    const sourceHeight = cropSize / scale.value

    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      cropSize,
      cropSize
    )

    tempCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create blob'))
        }
      },
      'image/jpeg',
      0.9
    )
  })
}

// 上传头像
async function handleUpload() {
  if (isUploading.value) return

  isUploading.value = true
  try {
    const blob = await cropImage()
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
    const res = await uploadAvatar(file)

    if (res.data.code === 200) {
      toast.success('头像上传成功')
      emit('uploaded', res.data.data.fileUrl)
      handleClose()
    } else {
      toast.error(res.data.message || '上传失败')
    }
  } catch (error) {
    toast.error('上传失败，请稍后重试')
  } finally {
    isUploading.value = false
  }
}

// 删除头像
async function handleDelete() {
  if (isDeleting.value) return

  isDeleting.value = true
  try {
    const res = await deleteAvatar()
    if (res.data.code === 200) {
      toast.success('头像已删除')
      emit('deleted')
      handleClose()
    } else {
      toast.error(res.data.message || '删除失败')
    }
  } catch (error) {
    toast.error('删除失败，请稍后重试')
  } finally {
    isDeleting.value = false
  }
}

// 关闭弹窗
function handleClose() {
  selectedFile.value = null
  imageUrl.value = null
  image.value = null
  scale.value = 1
  offsetX.value = 0
  offsetY.value = 0
  emit('close')
}

// 重新选择
function handleReselect() {
  selectedFile.value = null
  imageUrl.value = null
  image.value = null
  triggerFileSelect()
}

// 监听 show 变化，重置状态
watch(
  () => props.show,
  (newVal) => {
    if (!newVal) {
      selectedFile.value = null
      imageUrl.value = null
      image.value = null
    }
  }
)

// 清理
onUnmounted(() => {
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value)
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="show" class="modal-overlay" @click="handleClose">
        <Transition name="modal-scale">
          <div v-if="show" class="modal-content" @click.stop>
            <div class="modal-header">
              <h3 class="modal-title">{{ showCropper ? '裁剪头像' : '更换头像' }}</h3>
              <button class="close-btn" @click="handleClose">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div class="modal-body">
              <!-- 选择图片界面 -->
              <template v-if="!showCropper">
                <div class="upload-area" @click="triggerFileSelect">
                  <div v-if="currentAvatar" class="current-avatar">
                    <img :src="currentAvatar" alt="当前头像" />
                  </div>
                  <div v-else class="avatar-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <p class="upload-text">点击选择图片</p>
                  <p class="upload-hint">支持 JPEG、PNG、GIF、WebP，最大 10MB</p>
                </div>

                <div v-if="currentAvatar" class="delete-section">
                  <button
                    class="delete-btn"
                    :disabled="isDeleting"
                    @click.stop="handleDelete"
                  >
                    {{ isDeleting ? '删除中...' : '删除当前头像' }}
                  </button>
                </div>
              </template>

              <!-- 裁剪界面 -->
              <template v-else>
                <div class="cropper-container">
                  <canvas
                    ref="canvasRef"
                    :width="canvasSize"
                    :height="canvasSize"
                    class="cropper-canvas"
                    @pointerdown="onPointerDown"
                    @pointermove="onPointerMove"
                    @pointerup="onPointerUp"
                    @pointerleave="onPointerUp"
                    @wheel="onWheel"
                  ></canvas>
                </div>

                <div class="scale-control">
                  <svg class="scale-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                  </svg>
                  <input
                    type="range"
                    :min="minScale"
                    :max="maxScale"
                    :step="0.01"
                    :value="scale"
                    class="scale-slider"
                    @input="onScaleChange"
                  />
                  <svg class="scale-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    <line x1="11" y1="8" x2="11" y2="14"></line>
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                  </svg>
                </div>

                <p class="cropper-hint">拖动图片调整位置，滑动滑块或滚轮缩放</p>
              </template>
            </div>

            <div class="modal-footer">
              <template v-if="showCropper">
                <button class="btn btn-secondary" @click="handleReselect">
                  重新选择
                </button>
                <button
                  class="btn btn-primary"
                  :disabled="isUploading"
                  @click="handleUpload"
                >
                  {{ isUploading ? '上传中...' : '确认上传' }}
                </button>
              </template>
              <template v-else>
                <button class="btn btn-secondary" @click="handleClose">
                  取消
                </button>
              </template>
            </div>

            <input
              ref="fileInput"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/bmp"
              class="hidden-input"
              @change="onFileChange"
            />
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-md);
}

.modal-content {
  background: var(--color-card);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 360px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xl);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.close-btn:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.close-btn svg {
  width: 18px;
  height: 18px;
}

.modal-body {
  padding: var(--spacing-lg);
  overflow-y: auto;
}

.modal-footer {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}

.modal-footer .btn {
  flex: 1;
}

/* Upload Area */
.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--spacing-xl);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.upload-area:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.current-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: var(--spacing-md);
  border: 3px solid var(--color-border);
}

.current-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--spacing-md);
}

.avatar-placeholder svg {
  width: 48px;
  height: 48px;
  color: var(--color-text-placeholder);
}

.upload-text {
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  color: var(--color-text);
  margin-bottom: var(--spacing-xs);
}

.upload-hint {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.delete-section {
  margin-top: var(--spacing-md);
  text-align: center;
}

.delete-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--text-sm);
  color: var(--color-error);
  background: transparent;
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.delete-btn:hover:not(:disabled) {
  background: var(--color-error);
  color: white;
}

.delete-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Cropper */
.cropper-container {
  display: flex;
  justify-content: center;
  margin-bottom: var(--spacing-md);
}

.cropper-canvas {
  border-radius: var(--radius-md);
  cursor: grab;
  touch-action: none;
  max-width: 100%;
  height: auto;
}

.cropper-canvas:active {
  cursor: grabbing;
}

.scale-control {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: 0 var(--spacing-sm);
}

.scale-icon {
  width: 20px;
  height: 20px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.scale-slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--color-border);
  border-radius: var(--radius-full);
  outline: none;
}

.scale-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: var(--color-primary);
  border-radius: 50%;
  cursor: pointer;
  transition: transform var(--transition-fast);
}

.scale-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.scale-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: var(--color-primary);
  border: none;
  border-radius: 50%;
  cursor: pointer;
}

.cropper-hint {
  text-align: center;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-sm);
}

/* Buttons */
.btn {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--color-border);
  color: var(--color-text);
}

.btn-secondary:hover {
  background: var(--color-text-placeholder);
}

.hidden-input {
  display: none;
}

/* Animations */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity var(--transition-normal);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-scale-enter-active,
.modal-scale-leave-active {
  transition: all var(--transition-normal);
}

.modal-scale-enter-from,
.modal-scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
