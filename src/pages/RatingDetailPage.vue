<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useUserStore } from '@/stores/user'
import { useScoringTour } from '@/composables/useScoringTour'
import {
  getRatingItemDetail,
  submitRating,
  createComment,
  deleteComment,
  toggleLike,
  getContributionHistory,
  uploadCommentImage,
} from '@/api/rating'
import { getUserAvatar } from '@/api/user'
import type { RatingItemDetail, Comment, ContributionHistoryItem } from '@/types/rating'
import PageHeader from '@/components/layout/PageHeader.vue'
import FeedbackDrawer from '@/components/feedback/FeedbackDrawer.vue'
import UserProfilePopover from '@/components/ui/UserProfilePopover.vue'

// 扁平化的回复类型，包含被回复人信息
interface FlattenedReply extends Comment {
  replyToNickname: string | null // 被回复人昵称
}

const route = useRoute()
const router = useRouter()
const toast = useToast()
const userStore = useUserStore()
const {
  shouldStartTour,
  getCurrentStep,
  TourStep,
  saveStep,
  highlightElement,
  destroyDriver,
} = useScoringTour()

// 路由参数
const itemId = Number(route.params.itemId)

// 状态
const isLoading = ref(true)
const detail = ref<RatingItemDetail | null>(null)

// 用户评分状态
const userRating = ref(0)
const hoverRating = ref(0)
const isSubmitting = ref(false)

// 评论状态
const replyTarget = ref<{ commentId: number; nickname: string } | null>(null)
const replyText = ref('')
const isReplying = ref(false)

// 底部评论输入状态
const bottomCommentText = ref('')
const isSubmittingComment = ref(false)

// 评论图片相关状态
interface PendingImage {
  id: number | null // 上传成功后的服务器ID，上传中为null
  file: File
  previewUrl: string
  status: 'uploading' | 'success' | 'error'
  errorMessage?: string
}
const pendingImages = ref<PendingImage[]>([])
const imageInputRef = ref<HTMLInputElement | null>(null)
const MAX_IMAGES = 9
const MAX_IMAGE_SIZE = 20 * 1024 * 1024 // 20MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']

// 图片预览大图状态
const previewImageUrl = ref<string | null>(null)
const previewImageIndex = ref(0)
const previewImageList = ref<string[]>([])

// 排序状态
const commentSortBy = ref<'time' | 'hot'>('hot')
const drawerSortBy = ref<'time' | 'hot'>('time')

// 回复抽屉状态
const replyDrawerComment = ref<Comment | null>(null)
const isDrawerOpen = ref(false)
const drawerReplyTarget = ref<{ commentId: number; nickname: string } | null>(null)
const drawerReplyText = ref('')
const isSubmittingDrawerReply = ref(false)

// 删除确认模态框状态
const showDeleteConfirm = ref(false)
const deleteTargetId = ref<number | null>(null)
const isDeleting = ref(false)

// 反馈抽屉状态
const isFeedbackOpen = ref(false)

// 用户头像缓存（userId -> avatarUrl）
const userAvatars = ref<Map<number, string | null>>(new Map())

// 用户信息气泡状态
const showUserPopover = ref(false)
const popoverUserId = ref<number | null>(null)
const popoverTriggerElement = ref<HTMLElement | null>(null)

function openFeedbackDrawer() {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal()
    return
  }
  isFeedbackOpen.value = true
}

function closeFeedbackDrawer() {
  isFeedbackOpen.value = false
}

function handleFeedbackSuccess() {
  // 可以在这里做额外处理
}

// 更改历史弹窗状态
const isHistoryOpen = ref(false)
const historyList = ref<ContributionHistoryItem[]>([])
const isLoadingHistory = ref(false)

async function openHistoryModal() {
  isHistoryOpen.value = true
  isLoadingHistory.value = true
  try {
    const res = await getContributionHistory(3, itemId) // targetType 3 = 评分项目
    if (res.data.code === 200) {
      historyList.value = res.data.data || []
    } else {
      toast.error(res.data.message || '获取历史失败')
    }
  } catch {
    toast.error('获取历史失败')
  } finally {
    isLoadingHistory.value = false
  }
}

function closeHistoryModal() {
  isHistoryOpen.value = false
}

// 格式化历史时间
function formatHistoryTime(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// 获取字段名称显示
function getFieldLabel(fieldName: string): string {
  switch (fieldName) {
    case 'name':
      return '名称'
    case 'description':
      return '描述'
    case 'image':
      return '图片'
    default:
      return fieldName
  }
}

// 排序后的评论列表
const sortedComments = computed(() => {
  if (!detail.value?.comments) return []
  const comments = [...detail.value.comments]
  if (commentSortBy.value === 'hot') {
    return comments.sort((a, b) => b.likeCount - a.likeCount)
  }
  return comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

// 递归扁平化回复列表，记录被回复人（直接修改原对象以保持引用，使点赞等操作能正确更新）
function flattenReplies(replies: Comment[] | null, parentNickname: string | null = null): FlattenedReply[] {
  if (!replies || replies.length === 0) return []
  const result: FlattenedReply[] = []
  for (const reply of replies) {
    // 直接在原对象上添加 replyToNickname，保持引用以支持点赞等操作
    // 如果已经设置了 replyToNickname（乐观更新时设置），则不覆盖
    const flatReply = reply as FlattenedReply
    if (flatReply.replyToNickname === undefined) {
      flatReply.replyToNickname = parentNickname
    }
    result.push(flatReply)
    // 递归处理嵌套的回复
    if (reply.replies && reply.replies.length > 0) {
      result.push(...flattenReplies(reply.replies, reply.nickname))
    }
  }
  return result
}

// 排序后的抽屉回复列表（扁平化处理嵌套回复）
const sortedDrawerReplies = computed(() => {
  if (!replyDrawerComment.value?.replies) return []
  // 扁平化所有嵌套回复
  const flatReplies = flattenReplies(replyDrawerComment.value.replies)
  if (drawerSortBy.value === 'hot') {
    return flatReplies.sort((a, b) => b.likeCount - a.likeCount)
  }
  // 回复区按时间正序（早的在前面）
  return flatReplies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
})

// 获取热门回复（按点赞数排序，取前2条）
function getHotReplies(replies: Comment[] | null): Comment[] {
  if (!replies || replies.length === 0) return []
  return [...replies].sort((a, b) => b.likeCount - a.likeCount).slice(0, 2)
}

// 递归计算回复总数（包括嵌套回复）
function getTotalReplyCount(replies: Comment[] | null): number {
  if (!replies || replies.length === 0) return 0
  let count = replies.length
  for (const reply of replies) {
    count += getTotalReplyCount(reply.replies)
  }
  return count
}

// 打开回复抽屉
function openReplyDrawer(comment: Comment) {
  replyDrawerComment.value = comment
  isDrawerOpen.value = true
  drawerReplyTarget.value = null
  drawerReplyText.value = ''
  document.body.style.overflow = 'hidden'
}

// 关闭回复抽屉
function closeReplyDrawer() {
  isDrawerOpen.value = false
  document.body.style.overflow = ''
  drawerReplyTarget.value = null
  drawerReplyText.value = ''
  setTimeout(() => {
    replyDrawerComment.value = null
  }, 300)
}

// 触发图片选择
function triggerImageSelect() {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal()
    return
  }
  imageInputRef.value?.click()
}

// 处理图片选择
async function handleImageSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  // 检查总数量限制
  const remainingSlots = MAX_IMAGES - pendingImages.value.length
  if (remainingSlots <= 0) {
    toast.error(`最多只能上传${MAX_IMAGES}张图片`)
    input.value = ''
    return
  }

  const filesToUpload = Array.from(files).slice(0, remainingSlots)

  for (const file of filesToUpload) {
    // 验证文件类型
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error(`不支持的图片格式: ${file.name}`)
      continue
    }

    // 验证文件大小
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(`图片 ${file.name} 超过20MB限制`)
      continue
    }

    // 创建预览URL
    const previewUrl = URL.createObjectURL(file)

    // 添加到待上传列表
    const pendingImage: PendingImage = {
      id: null,
      file,
      previewUrl,
      status: 'uploading',
    }
    pendingImages.value.push(pendingImage)

    // 异步上传（传入 previewUrl 作为标识）
    uploadImage(previewUrl)
  }

  // 清空input以便重复选择同一文件
  input.value = ''
}

// 上传单张图片（使用 previewUrl 作为唯一标识）
async function uploadImage(previewUrl: string) {
  // 通过 previewUrl 找到对应的图片
  const index = pendingImages.value.findIndex(img => img.previewUrl === previewUrl)
  if (index === -1) return // 图片可能已被删除

  const pendingImage = pendingImages.value[index]
  if (!pendingImage) return

  try {
    const res = await uploadCommentImage(pendingImage.file)
    // 再次查找索引，因为在异步期间数组可能已变化
    const currentIndex = pendingImages.value.findIndex(img => img.previewUrl === previewUrl)
    if (currentIndex === -1) return // 图片已被删除

    const currentImage = pendingImages.value[currentIndex]
    if (!currentImage) return

    if (res.data.code === 200 && res.data.data) {
      pendingImages.value[currentIndex] = {
        ...currentImage,
        id: res.data.data.id,
        status: 'success',
      }
    } else {
      pendingImages.value[currentIndex] = {
        ...currentImage,
        status: 'error',
        errorMessage: res.data.message || '上传失败',
      }
    }
  } catch {
    const currentIndex = pendingImages.value.findIndex(img => img.previewUrl === previewUrl)
    if (currentIndex === -1) return

    const currentImage = pendingImages.value[currentIndex]
    if (!currentImage) return

    pendingImages.value[currentIndex] = {
      ...currentImage,
      status: 'error',
      errorMessage: '上传失败',
    }
  }
}

// 移除待上传图片
function removePendingImage(index: number) {
  const image = pendingImages.value[index]
  if (image) {
    URL.revokeObjectURL(image.previewUrl)
    pendingImages.value.splice(index, 1)
  }
}

// 重试上传
function retryUpload(index: number) {
  const image = pendingImages.value[index]
  if (image && image.status === 'error') {
    // 更新状态
    pendingImages.value[index] = {
      ...image,
      status: 'uploading',
      errorMessage: undefined,
    }
    // 使用 previewUrl 来标识
    uploadImage(image.previewUrl)
  }
}

// 打开图片预览
function openImagePreview(imageList: string[], index: number) {
  previewImageList.value = imageList
  previewImageIndex.value = index
  previewImageUrl.value = imageList[index] ?? null
  document.body.style.overflow = 'hidden'
}

// 关闭图片预览
function closeImagePreview() {
  previewImageUrl.value = null
  previewImageList.value = []
  document.body.style.overflow = ''
}

// 切换预览图片
function switchPreviewImage(direction: 'prev' | 'next') {
  const len = previewImageList.value.length
  if (len <= 1) return
  if (direction === 'prev') {
    previewImageIndex.value = (previewImageIndex.value - 1 + len) % len
  } else {
    previewImageIndex.value = (previewImageIndex.value + 1) % len
  }
  previewImageUrl.value = previewImageList.value[previewImageIndex.value] ?? null
}

// 计算是否有图片正在上传
const hasUploadingImages = computed(() => pendingImages.value.some(img => img.status === 'uploading'))

// 获取已成功上传的图片ID列表
const uploadedImageIds = computed(() =>
  pendingImages.value
    .filter(img => img.status === 'success' && img.id !== null)
    .map(img => img.id as number)
)

// 底部评论框提交（乐观更新）
async function submitBottomComment() {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal()
    return
  }
  if (!bottomCommentText.value.trim() || isSubmittingComment.value) return

  // 检查是否有图片正在上传
  if (hasUploadingImages.value) {
    toast.error('请等待图片上传完成')
    return
  }

  // 检查是否有上传失败的图片
  if (pendingImages.value.some(img => img.status === 'error')) {
    toast.error('有图片上传失败，请重试或移除')
    return
  }

  const commentText = bottomCommentText.value.trim()
  const imageIds = uploadedImageIds.value

  // 保存 blob URL 引用，用于稍后释放（不能立即释放，因为乐观更新需要用）
  const blobUrlsToRevoke = pendingImages.value.map(img => img.previewUrl)

  // 乐观更新：创建临时评论（包含图片预览URL）
  const tempImageUrls = [...blobUrlsToRevoke]
  const tempComment: Comment = {
    id: Date.now(), // 临时 ID
    userId: userStore.user?.id || 0,
    commentText,
    username: userStore.user?.username || '',
    nickname: userStore.user?.nickname || '我',
    createdAt: new Date().toISOString(),
    likeCount: 0,
    isLiked: false,
    isMyComment: true,
    commenterScore: null,
    commenterStars: null,
    imageUrls: tempImageUrls.length > 0 ? tempImageUrls : null,
    replies: null,
  }

  // 添加到评论列表最前面
  if (detail.value) {
    if (!detail.value.comments) {
      detail.value.comments = []
    }
    detail.value.comments.unshift(tempComment)
  }

  bottomCommentText.value = ''
  // 先清空待上传图片数组（但不释放 blob URL，等刷新后再释放）
  pendingImages.value = []

  // 滚动到页面顶部
  window.scrollTo({ top: 0, behavior: 'smooth' })

  isSubmittingComment.value = true
  try {
    const res = await createComment({
      ratingItemId: itemId,
      commentText,
      imageIds: imageIds.length > 0 ? imageIds : undefined,
    })
    if (res.data.code === 200) {
      // 成功：用服务器返回的真实 ID 更新临时评论，确保点赞等操作使用正确的 ID
      const realComment = res.data.data
      if (realComment) {
        tempComment.id = realComment.id
      }
      // 静默刷新获取最新数据（刷新后会用服务器返回的真实 URL 替换临时 URL）
      await loadDetail(true)
      // 刷新完成后释放 blob URL
      blobUrlsToRevoke.forEach(url => URL.revokeObjectURL(url))
    } else {
      // 失败：移除临时评论并释放 blob URL
      if (detail.value?.comments) {
        detail.value.comments = detail.value.comments.filter(c => c.id !== tempComment.id)
      }
      blobUrlsToRevoke.forEach(url => URL.revokeObjectURL(url))
      toast.error(res.data.message || '评论失败')
    }
  } catch {
    // 失败：移除临时评论并释放 blob URL
    if (detail.value?.comments) {
      detail.value.comments = detail.value.comments.filter(c => c.id !== tempComment.id)
    }
    blobUrlsToRevoke.forEach(url => URL.revokeObjectURL(url))
    toast.error('评论失败')
  } finally {
    isSubmittingComment.value = false
  }
}

// 抽屉内开始回复
function startDrawerReply(commentId: number, nickname: string) {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal()
    return
  }
  drawerReplyTarget.value = { commentId, nickname }
}

// 取消抽屉内回复
function cancelDrawerReply() {
  drawerReplyTarget.value = null
  drawerReplyText.value = ''
}

// 提交抽屉内回复（乐观更新）
async function submitDrawerReply() {
  if (!replyDrawerComment.value || !drawerReplyText.value.trim() || isSubmittingDrawerReply.value) return

  const commentText = drawerReplyText.value.trim()
  // 如果有回复目标（点击了某条评论的回复按钮），使用该评论ID作为parentId
  // 否则（直接在输入框输入），使用一级评论ID作为parentId
  const parentId = drawerReplyTarget.value?.commentId ?? replyDrawerComment.value.id
  // 保存被回复人的昵称，用于乐观更新时显示"回复 @xxx"
  const replyToNickname = drawerReplyTarget.value?.nickname

  // 乐观更新：创建临时回复（使用 FlattenedReply 类型以支持 replyToNickname）
  const tempReply: FlattenedReply = {
    id: Date.now(),
    userId: userStore.user?.id || 0,
    commentText,
    username: userStore.user?.username || '',
    nickname: userStore.user?.nickname || '我',
    createdAt: new Date().toISOString(),
    likeCount: 0,
    isLiked: false,
    isMyComment: true,
    commenterScore: null,
    commenterStars: null,
    imageUrls: null, // 回复不支持图片
    replies: null,
    replyToNickname: replyToNickname ?? null, // 设置被回复人昵称，使乐观更新时能正确显示"回复 @xxx"
  }

  // 添加到抽屉的回复列表
  if (!replyDrawerComment.value.replies) {
    replyDrawerComment.value.replies = []
  }
  replyDrawerComment.value.replies.unshift(tempReply)

  // 同步更新主列表中的评论
  if (detail.value?.comments) {
    const mainComment = detail.value.comments.find(c => c.id === parentId)
    if (mainComment) {
      if (!mainComment.replies) {
        mainComment.replies = []
      }
      mainComment.replies.unshift(tempReply)
    }
  }

  drawerReplyTarget.value = null
  drawerReplyText.value = ''

  isSubmittingDrawerReply.value = true
  try {
    const res = await createComment({
      ratingItemId: itemId,
      commentText,
      parentId,
    })
    if (res.data.code === 200) {
      // 成功：用服务器返回的真实 ID 更新临时回复，确保点赞等操作使用正确的 ID
      const realReply = res.data.data
      if (realReply) {
        // 由于 tempReply 同时被添加到两个列表中（同一引用），直接修改对象属性即可
        tempReply.id = realReply.id
      }
    } else {
      // 失败：移除临时回复
      if (replyDrawerComment.value?.replies) {
        replyDrawerComment.value.replies = replyDrawerComment.value.replies.filter(r => r.id !== tempReply.id)
      }
      if (detail.value?.comments) {
        const mainComment = detail.value.comments.find(c => c.id === replyDrawerComment.value?.id)
        if (mainComment?.replies) {
          mainComment.replies = mainComment.replies.filter(r => r.id !== tempReply.id)
        }
      }
      toast.error(res.data.message || '回复失败')
    }
  } catch {
    // 失败：移除临时回复
    if (replyDrawerComment.value?.replies) {
      replyDrawerComment.value.replies = replyDrawerComment.value.replies.filter(r => r.id !== tempReply.id)
    }
    if (detail.value?.comments) {
      const mainComment = detail.value.comments.find(c => c.id === replyDrawerComment.value?.id)
      if (mainComment?.replies) {
        mainComment.replies = mainComment.replies.filter(r => r.id !== tempReply.id)
      }
    }
    toast.error('回复失败')
  } finally {
    isSubmittingDrawerReply.value = false
  }
}

// 加载详情
async function loadDetail(silent = false) {
  if (!silent) {
    isLoading.value = true
  }
  try {
    const res = await getRatingItemDetail(itemId)
    if (res.data.code === 200) {
      detail.value = res.data.data
      // 如果已有评分，初始化用户评分（myRating 是 10 分制，转换为 5 星）
      if (detail.value?.myRating !== null && detail.value?.myRating !== undefined) {
        userRating.value = Math.round(detail.value.myRating / 2)
      }
      // 如果抽屉打开着，同步更新抽屉中的评论数据
      if (isDrawerOpen.value && replyDrawerComment.value && detail.value?.comments) {
        const updatedComment = detail.value.comments.find(c => c.id === replyDrawerComment.value!.id)
        if (updatedComment) {
          replyDrawerComment.value = updatedComment
        }
      }
      // 异步加载评论区用户头像（不阻塞）
      loadCommentsAvatars()
    } else if (!silent) {
      toast.error(res.data.message || '获取详情失败')
    }
  } catch {
    if (!silent) {
      toast.error('获取详情失败')
    }
  } finally {
    if (!silent) {
      isLoading.value = false
    }
  }
}

// 面包屑文本（只显示大分区和小分区）
const breadcrumbText = computed(() => {
  if (!detail.value?.breadcrumb) return ''
  const b = detail.value.breadcrumb
  return `${b.majorSection.name} / ${b.minorSection.name}`
})

// 评分分布数组（从对象转换为数组便于渲染）
const scoreDistributionList = computed(() => {
  if (!detail.value?.scoreDistribution) return []
  const dist = detail.value.scoreDistribution
  return [
    { star: 5, count: dist.fiveStar, percent: dist.fiveStarPercent },
    { star: 4, count: dist.fourStar, percent: dist.fourStarPercent },
    { star: 3, count: dist.threeStar, percent: dist.threeStarPercent },
    { star: 2, count: dist.twoStar, percent: dist.twoStarPercent },
    { star: 1, count: dist.oneStar, percent: dist.oneStarPercent },
  ]
})

// 显示的评分（悬停时显示悬停值）
const displayRating = computed(() => {
  return hoverRating.value || userRating.value
})

// 星星点击 - 直接提交评分
async function handleStarClick(star: number) {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal()
    return
  }
  if (isSubmitting.value) return

  // 保存服务器上的真实评分用于回退（myRating 是 10 分制，转换为 5 星）
  const serverRating = detail.value?.myRating !== null && detail.value?.myRating !== undefined
    ? Math.round(detail.value.myRating / 2)
    : 0

  userRating.value = star
  isSubmitting.value = true
  try {
    const res = await submitRating({
      ratingItemId: itemId,
      stars: star,
    })
    if (res.data.code === 200) {
      await loadDetail(true)
    } else {
      userRating.value = serverRating
      toast.error(res.data.message || '评分失败')
    }
  } catch {
    userRating.value = serverRating
    toast.error('评分失败')
  } finally {
    isSubmitting.value = false
  }
}

// 星星悬停
function handleStarHover(star: number) {
  hoverRating.value = star
}

// 星星离开
function handleStarLeave() {
  hoverRating.value = 0
}

// 点赞评论（乐观更新）
async function handleLike(comment: Comment) {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal()
    return
  }

  // 乐观更新：先切换状态
  const wasLiked = comment.isLiked
  const prevCount = comment.likeCount
  comment.isLiked = !wasLiked
  comment.likeCount = wasLiked ? prevCount - 1 : prevCount + 1

  try {
    const res = await toggleLike(comment.id)
    if (res.data.code !== 200) {
      // 失败：恢复状态
      comment.isLiked = wasLiked
      comment.likeCount = prevCount
      toast.error(res.data.message || '操作失败')
    }
  } catch {
    // 失败：恢复状态
    comment.isLiked = wasLiked
    comment.likeCount = prevCount
    toast.error('操作失败')
  }
}

// 开始回复
function startReply(commentId: number, nickname: string) {
  if (!userStore.isLoggedIn) {
    userStore.openLoginModal()
    return
  }
  replyTarget.value = { commentId, nickname }
  replyText.value = ''
}

// 取消回复
function cancelReply() {
  replyTarget.value = null
  replyText.value = ''
}

// 提交回复（乐观更新）
async function handleSubmitReply() {
  if (!replyTarget.value || !replyText.value.trim()) return

  const commentText = replyText.value.trim()
  const parentId = replyTarget.value.commentId

  // 乐观更新：创建临时回复
  const tempReply: Comment = {
    id: Date.now(),
    userId: userStore.user?.id || 0,
    commentText,
    username: userStore.user?.username || '',
    nickname: userStore.user?.nickname || '我',
    createdAt: new Date().toISOString(),
    likeCount: 0,
    isLiked: false,
    isMyComment: true,
    commenterScore: null,
    commenterStars: null,
    imageUrls: null, // 回复不支持图片
    replies: null,
  }

  // 添加到父评论的回复列表
  if (detail.value?.comments) {
    const parentComment = detail.value.comments.find(c => c.id === parentId)
    if (parentComment) {
      if (!parentComment.replies) {
        parentComment.replies = []
      }
      parentComment.replies.unshift(tempReply)
    }
  }

  cancelReply()

  isReplying.value = true
  try {
    const res = await createComment({
      ratingItemId: itemId,
      commentText,
      parentId,
    })
    if (res.data.code === 200) {
      // 成功：用服务器返回的真实 ID 更新临时回复，确保点赞等操作使用正确的 ID
      const realReply = res.data.data
      if (realReply) {
        tempReply.id = realReply.id
      }
      // 静默刷新获取最新数据
      await loadDetail(true)
    } else {
      // 失败：移除临时回复
      if (detail.value?.comments) {
        const parentComment = detail.value.comments.find(c => c.id === parentId)
        if (parentComment?.replies) {
          parentComment.replies = parentComment.replies.filter(r => r.id !== tempReply.id)
        }
      }
      toast.error(res.data.message || '回复失败')
    }
  } catch {
    // 失败：移除临时回复
    if (detail.value?.comments) {
      const parentComment = detail.value.comments.find(c => c.id === parentId)
      if (parentComment?.replies) {
        parentComment.replies = parentComment.replies.filter(r => r.id !== tempReply.id)
      }
    }
    toast.error('回复失败')
  } finally {
    isReplying.value = false
  }
}

// 打开删除确认模态框
function openDeleteConfirm(commentId: number) {
  deleteTargetId.value = commentId
  showDeleteConfirm.value = true
}

// 取消删除
function cancelDeleteComment() {
  showDeleteConfirm.value = false
  deleteTargetId.value = null
}

// 确认删除评论
async function confirmDeleteComment() {
  if (!deleteTargetId.value) return

  isDeleting.value = true
  try {
    const res = await deleteComment(deleteTargetId.value)
    if (res.data.code === 200) {
      toast.success('删除成功')
      showDeleteConfirm.value = false
      deleteTargetId.value = null
      await loadDetail(true) // 静默重载数据
    } else {
      toast.error(res.data.message || '删除失败')
    }
  } catch {
    toast.error('删除失败')
  } finally {
    isDeleting.value = false
  }
}

// 格式化时间
function formatTime(timeStr: string): string {
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 30) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}

// 获取用户头像 URL（如果已加载）
function getAvatarUrl(userId: number): string | null | undefined {
  return userAvatars.value.get(userId)
}

// 显示用户信息气泡
function showUserProfile(userId: number, event: MouseEvent) {
  event.stopPropagation()
  const target = event.currentTarget as HTMLElement
  popoverUserId.value = userId
  popoverTriggerElement.value = target
  showUserPopover.value = true
}

// 关闭用户信息气泡
function closeUserPopover() {
  showUserPopover.value = false
  popoverUserId.value = null
  popoverTriggerElement.value = null
}

// 异步加载评论区用户头像（不阻塞主流程）
async function loadCommentsAvatars() {
  if (!detail.value?.comments) return

  // 收集所有需要加载头像的 userId（去重）
  const userIds = new Set<number>()

  function collectUserIds(comments: Comment[] | null) {
    if (!comments) return
    for (const comment of comments) {
      if (comment.userId && !userAvatars.value.has(comment.userId)) {
        userIds.add(comment.userId)
      }
      if (comment.replies) {
        collectUserIds(comment.replies)
      }
    }
  }

  collectUserIds(detail.value.comments)

  // 并行请求所有用户头像（每个请求独立，失败不影响其他）
  for (const userId of userIds) {
    // 标记为正在加载（设为 null）
    userAvatars.value.set(userId, null)

    // 异步请求，不等待
    getUserAvatar(userId)
      .then((res) => {
        if (res.data.code === 200 && res.data.data?.hasAvatar && res.data.data?.avatarUrl) {
          userAvatars.value.set(userId, res.data.data.avatarUrl)
        }
      })
      .catch(() => {
        // 请求失败，保持 null（显示默认头像）
      })
  }
}

// 获取分数条宽度
function getScoreBarWidth(percentage: number): string {
  return `${Math.max(percentage, 2)}%`
}

onMounted(() => {
  loadDetail()

  // 检查是否需要启动引导
  if (shouldStartTour()) {
    const step = getCurrentStep()
    if (step === TourStep.RATING_DETAIL_FEEDBACK) {
      waitForDataAndStartTour()
    }
  }
})

onUnmounted(() => {
  destroyDriver()
})

// 等待数据加载完成后启动引导
function waitForDataAndStartTour() {
  const checkInterval = setInterval(() => {
    if (!isLoading.value && detail.value) {
      clearInterval(checkInterval)
      setTimeout(() => {
        showDetailFeedbackTour()
      }, 300)
    }
  }, 100)
  setTimeout(() => clearInterval(checkInterval), 5000)
}

// 步骤10：反馈按钮
function showDetailFeedbackTour() {
  highlightElement(
    '#tour-detail-feedback',
    '提交反馈',
    '如果评分项目有更新（如描述已经过时，或已不存在），可以通过这里进行反馈。',
    {
      side: 'bottom',
      nextBtnText: '继续引导',
      onNextClick: () => {
        saveStep(TourStep.COMMUNITY_HOT)
        destroyDriver()
        // 返回评分社区主页
        router.push('/community')
      },
    }
  )
}
</script>

<template>
  <div class="page-container">
    <PageHeader />

    <main class="page-content">
      <!-- 骨架屏加载 -->
      <template v-if="isLoading">
        <div class="skeleton-header">
          <div class="skeleton-image"></div>
          <div class="skeleton-info">
            <div class="skeleton-title"></div>
            <div class="skeleton-breadcrumb"></div>
          </div>
        </div>
        <div class="skeleton-score-card"></div>
        <div class="skeleton-comments">
          <div v-for="i in 3" :key="i" class="skeleton-comment"></div>
        </div>
      </template>

      <!-- 正常内容 -->
      <template v-else-if="detail">
        <!-- 项目头部卡片 -->
        <div class="item-header-card">
          <div class="item-header">
            <div class="item-image-wrapper">
              <img
                v-if="detail.url"
                :src="detail.url"
                :alt="detail.name"
                class="item-image"
              />
              <div v-else class="item-image-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </div>
            </div>
            <div class="item-info">
              <h1 class="item-name">{{ detail.name }}</h1>
              <p v-if="breadcrumbText" class="item-breadcrumb">{{ breadcrumbText }}</p>
              <p v-if="detail.description" class="item-desc">{{ detail.description }}</p>
            </div>
          </div>
          <!-- 操作按钮区 -->
          <div class="item-actions">
            <!-- 反馈按钮 -->
            <button id="tour-detail-feedback" class="feedback-btn" @click="openFeedbackDrawer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              信息有误？提交反馈
            </button>
            <!-- 历史按钮 -->
            <button class="history-btn" @click="openHistoryModal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              更改历史
            </button>
          </div>
        </div>

        <!-- 评分卡片 -->
        <div class="score-card">
          <div class="score-content">
            <div class="score-main">
              <div class="score-value">{{ detail.averageScore.toFixed(1) }}</div>
              <div class="rating-count">{{ detail.ratingCount }}人评分</div>
            </div>
            <div class="score-divider-vertical"></div>
            <div v-if="scoreDistributionList.length > 0" class="score-distribution">
              <div
                v-for="dist in scoreDistributionList"
                :key="dist.star"
                class="dist-row"
              >
                <div class="dist-stars">
                  <svg
                    v-for="s in 5"
                    :key="s"
                    class="dist-star-icon"
                    :class="{ inactive: s > dist.star }"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    stroke="currentColor"
                    stroke-width="1"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </div>
                <div class="dist-bar-wrapper">
                  <div
                    class="dist-bar"
                    :style="{ width: getScoreBarWidth(dist.percent) }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 分隔线 -->
          <div class="score-divider"></div>

          <!-- 用户评分区域 -->
          <div class="user-rating-row">
            <span class="user-rating-label">
              {{ detail.myRating !== null ? '已评分' : '未评分' }}
            </span>
            <div class="user-rating-stars">
              <button
                v-for="star in 5"
                :key="star"
                class="star-btn"
                :class="{ active: star <= displayRating, submitting: isSubmitting }"
                @click="handleStarClick(star)"
                @mouseenter="handleStarHover(star)"
                @mouseleave="handleStarLeave"
              >
                <svg viewBox="0 0 24 24" :fill="star <= displayRating ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- 评论区域 -->
        <div class="comments-section">
          <div class="comments-header">
            <span class="comments-count">全部评论 ({{ detail.comments?.length || 0 }})</span>
            <div class="sort-tabs">
              <button
                class="sort-tab"
                :class="{ active: commentSortBy === 'time' }"
                @click="commentSortBy = 'time'"
              >
                按时间
              </button>
              <button
                class="sort-tab"
                :class="{ active: commentSortBy === 'hot' }"
                @click="commentSortBy = 'hot'"
              >
                按热度
              </button>
            </div>
          </div>

          <!-- 空评论状态 -->
          <div v-if="!detail.comments || detail.comments.length === 0" class="empty-comments">
            <p>暂无评论，快来发表第一条评论吧~</p>
          </div>

          <!-- 评论列表 -->
          <div v-else-if="detail.comments" class="comment-list">
            <div v-for="comment in sortedComments" :key="comment.id" class="comment-card">
              <!-- 主评论 -->
              <div class="comment-main">
                <div
                  class="comment-avatar clickable"
                  :class="{ 'has-avatar': getAvatarUrl(comment.userId) }"
                  @click="showUserProfile(comment.userId, $event)"
                >
                  <img v-if="getAvatarUrl(comment.userId)" :src="getAvatarUrl(comment.userId)!" alt="" class="avatar-img" />
                  <template v-else>{{ comment.nickname.charAt(0) }}</template>
                </div>
                <div class="comment-body">
                  <div class="comment-header">
                    <span class="comment-nickname">{{ comment.nickname }}</span>
                    <span v-if="comment.commenterStars !== null" class="commenter-stars">
                      <svg
                        v-for="i in 5"
                        :key="i"
                        class="star-icon"
                        :class="{ filled: i <= comment.commenterStars }"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </span>
                  </div>
                  <p class="comment-text">{{ comment.commentText }}</p>
                  <!-- 评论图片 -->
                  <div v-if="comment.imageUrls && comment.imageUrls.length > 0" class="comment-images">
                    <div
                      v-for="(imgUrl, imgIndex) in comment.imageUrls"
                      :key="imgIndex"
                      class="comment-image-item"
                      :class="{ 'single': comment.imageUrls.length === 1, 'double': comment.imageUrls.length === 2 }"
                      @click="openImagePreview(comment.imageUrls!, imgIndex)"
                    >
                      <img :src="imgUrl" alt="" class="comment-image-thumb" loading="lazy" />
                    </div>
                  </div>
                  <div class="comment-footer">
                    <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
                    <div class="comment-actions">
                      <button
                        class="action-btn"
                        :class="{ liked: comment.isLiked }"
                        @click="handleLike(comment)"
                      >
                        <svg viewBox="0 0 24 24" :fill="comment.isLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                        </svg>
                        <span v-if="comment.likeCount > 0">{{ comment.likeCount }}</span>
                      </button>
                      <button class="action-btn" @click="startReply(comment.id, comment.nickname)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                        </svg>
                        回复
                      </button>
                      <button
                        v-if="comment.isMyComment"
                        class="action-btn delete"
                        @click="openDeleteConfirm(comment.id)"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 热门回复预览 -->
              <div v-if="comment.replies && comment.replies.length > 0" class="replies-preview">
                <div
                  v-for="reply in getHotReplies(comment.replies)"
                  :key="reply.id"
                  class="reply-preview-item"
                >
                  <span class="reply-author">{{ reply.nickname }}：</span>
                  <span class="reply-text">{{ reply.commentText }}</span>
                </div>
                <button
                  v-if="comment.replies.length > 0"
                  class="view-replies-btn"
                  @click="openReplyDrawer(comment)"
                >
                  查看全部 {{ getTotalReplyCount(comment.replies) }} 条回复
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>

              <!-- 回复输入框 -->
              <div v-if="replyTarget?.commentId === comment.id" class="reply-input-wrapper">
                <textarea
                  v-model="replyText"
                  class="reply-input"
                  :placeholder="`回复 @${replyTarget.nickname}...`"
                  rows="2"
                ></textarea>
                <div class="reply-actions">
                  <button class="cancel-btn" @click="cancelReply">取消</button>
                  <button
                    class="submit-btn small"
                    :disabled="isReplying || !replyText.trim()"
                    @click="handleSubmitReply"
                  >
                    {{ isReplying ? '发送中...' : '发送' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部评论输入栏 -->
        <div class="bottom-input-bar">
          <!-- 待上传图片预览区（放在输入行上方） -->
          <Transition name="images-slide">
            <div v-if="pendingImages.length > 0" class="pending-images-bar">
              <div
                v-for="(img, index) in pendingImages"
                :key="img.previewUrl"
                class="pending-image-item"
                :class="{ 'is-uploading': img.status === 'uploading', 'is-error': img.status === 'error' }"
              >
                <img :src="img.previewUrl" alt="" class="pending-image-thumb" />
                <!-- 上传中遮罩 -->
                <div v-if="img.status === 'uploading'" class="pending-image-overlay">
                  <div class="upload-spinner"></div>
                </div>
                <!-- 上传失败遮罩 -->
                <div v-if="img.status === 'error'" class="pending-image-overlay error" @click="retryUpload(index)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 4v6h-6M1 20v-6h6"></path>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                </div>
                <!-- 删除按钮 -->
                <button class="pending-image-remove" @click="removePendingImage(index)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <!-- 添加更多图片按钮 -->
              <button
                v-if="pendingImages.length < MAX_IMAGES"
                class="add-more-image-btn"
                @click="triggerImageSelect"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            </div>
          </Transition>
          <!-- 输入行 -->
          <div class="bottom-input-row">
            <input
              ref="imageInputRef"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/bmp"
              multiple
              class="hidden-file-input"
              @change="handleImageSelect"
            />
            <!-- 输入框容器（包含图片按钮和输入框） -->
            <div class="input-wrapper">
              <!-- 图片选择按钮 -->
              <button
                class="image-select-btn"
                :class="{ 'has-images': pendingImages.length > 0 }"
                @click="triggerImageSelect"
                :disabled="pendingImages.length >= MAX_IMAGES"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
              </button>
              <input
                v-model="bottomCommentText"
                type="text"
                class="bottom-input"
                placeholder="写评论..."
                @keyup.enter="submitBottomComment"
              />
            </div>
            <button
              class="bottom-send-btn"
              :disabled="isSubmittingComment || !bottomCommentText.trim() || hasUploadingImages"
              @click="submitBottomComment"
            >
              {{ isSubmittingComment ? '...' : '发送' }}
            </button>
          </div>
        </div>

        <!-- 回复抽屉 -->
        <Teleport to="body">
          <Transition name="drawer">
            <div v-if="isDrawerOpen" class="drawer-overlay" @click="closeReplyDrawer">
              <div class="drawer-container" @click.stop>
                <div class="drawer-header">
                  <h3>回复详情</h3>
                  <button class="drawer-close" @click="closeReplyDrawer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
                <div class="drawer-content">
                  <!-- 原评论 -->
                  <div v-if="replyDrawerComment" class="drawer-original-comment">
                    <div
                      class="comment-avatar clickable"
                      :class="{ 'has-avatar': getAvatarUrl(replyDrawerComment.userId) }"
                      @click="showUserProfile(replyDrawerComment.userId, $event)"
                    >
                      <img v-if="getAvatarUrl(replyDrawerComment.userId)" :src="getAvatarUrl(replyDrawerComment.userId)!" alt="" class="avatar-img" />
                      <template v-else>{{ replyDrawerComment.nickname.charAt(0) }}</template>
                    </div>
                    <div class="comment-body">
                      <div class="comment-header">
                        <span class="comment-nickname">{{ replyDrawerComment.nickname }}</span>
                        <span v-if="replyDrawerComment.commenterStars !== null" class="commenter-stars">
                          <svg
                            v-for="i in 5"
                            :key="i"
                            class="star-icon"
                            :class="{ filled: i <= replyDrawerComment.commenterStars }"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </span>
                      </div>
                      <p class="comment-text">{{ replyDrawerComment.commentText }}</p>
                      <!-- 评论图片 -->
                      <div v-if="replyDrawerComment.imageUrls && replyDrawerComment.imageUrls.length > 0" class="comment-images">
                        <div
                          v-for="(imgUrl, imgIndex) in replyDrawerComment.imageUrls"
                          :key="imgIndex"
                          class="comment-image-item"
                          :class="{ 'single': replyDrawerComment.imageUrls.length === 1, 'double': replyDrawerComment.imageUrls.length === 2 }"
                          @click="openImagePreview(replyDrawerComment.imageUrls!, imgIndex)"
                        >
                          <img :src="imgUrl" alt="" class="comment-image-thumb" loading="lazy" />
                        </div>
                      </div>
                      <div class="comment-footer">
                        <span class="comment-time">{{ formatTime(replyDrawerComment.createdAt) }}</span>
                        <div class="comment-actions">
                          <button
                            class="action-btn"
                            :class="{ liked: replyDrawerComment.isLiked }"
                            @click="handleLike(replyDrawerComment)"
                          >
                            <svg viewBox="0 0 24 24" :fill="replyDrawerComment.isLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                            </svg>
                            <span v-if="replyDrawerComment.likeCount > 0">{{ replyDrawerComment.likeCount }}</span>
                          </button>
                          <button class="action-btn" @click="startDrawerReply(replyDrawerComment.id, replyDrawerComment.nickname)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                            </svg>
                            回复
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 回复列表标题和排序 -->
                  <div class="drawer-replies-header">
                    <span class="drawer-replies-count">相关回复共 {{ getTotalReplyCount(replyDrawerComment?.replies ?? null) }} 条</span>
                    <div class="sort-tabs">
                      <button
                        class="sort-tab"
                        :class="{ active: drawerSortBy === 'time' }"
                        @click="drawerSortBy = 'time'"
                      >
                        按时间
                      </button>
                      <button
                        class="sort-tab"
                        :class="{ active: drawerSortBy === 'hot' }"
                        @click="drawerSortBy = 'hot'"
                      >
                        按热度
                      </button>
                    </div>
                  </div>

                  <!-- 回复列表 -->
                  <div class="drawer-replies">
                    <div
                      v-for="reply in sortedDrawerReplies"
                      :key="reply.id"
                      class="drawer-reply-item"
                    >
                      <div
                        class="comment-avatar small clickable"
                        :class="{ 'has-avatar': getAvatarUrl(reply.userId) }"
                        @click="showUserProfile(reply.userId, $event)"
                      >
                        <img v-if="getAvatarUrl(reply.userId)" :src="getAvatarUrl(reply.userId)!" alt="" class="avatar-img" />
                        <template v-else>{{ reply.nickname.charAt(0) }}</template>
                      </div>
                      <div class="comment-body">
                        <div class="comment-header">
                          <span class="comment-nickname">{{ reply.nickname }}</span>
                          <span v-if="reply.commenterStars !== null" class="commenter-stars">
                            <svg
                              v-for="i in 5"
                              :key="i"
                              class="star-icon"
                              :class="{ filled: i <= reply.commenterStars }"
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                          </span>
                        </div>
                        <p class="comment-text">
                          <span v-if="reply.replyToNickname" class="reply-to">回复 @{{ reply.replyToNickname }}：</span>{{ reply.commentText }}
                        </p>
                        <div class="comment-footer">
                          <span class="comment-time">{{ formatTime(reply.createdAt) }}</span>
                          <div class="comment-actions">
                            <button
                              class="action-btn"
                              :class="{ liked: reply.isLiked }"
                              @click="handleLike(reply)"
                            >
                              <svg viewBox="0 0 24 24" :fill="reply.isLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                              </svg>
                              <span v-if="reply.likeCount > 0">{{ reply.likeCount }}</span>
                            </button>
                            <button class="action-btn" @click="startDrawerReply(reply.id, reply.nickname)">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                              </svg>
                              回复
                            </button>
                            <button
                              v-if="reply.isMyComment"
                              class="action-btn delete"
                              @click="openDeleteConfirm(reply.id)"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 抽屉底部回复输入栏 -->
                <div class="drawer-input-bar">
                  <input
                    v-model="drawerReplyText"
                    type="text"
                    class="bottom-input"
                    :placeholder="drawerReplyTarget ? `回复 @${drawerReplyTarget.nickname}...` : '写回复...'"
                    @keyup.enter="submitDrawerReply"
                  />
                  <button
                    v-if="drawerReplyTarget"
                    class="cancel-reply-btn"
                    @click="cancelDrawerReply"
                  >
                    取消
                  </button>
                  <button
                    class="bottom-send-btn"
                    :disabled="isSubmittingDrawerReply || !drawerReplyText.trim()"
                    @click="submitDrawerReply"
                  >
                    {{ isSubmittingDrawerReply ? '...' : '发送' }}
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>

        <!-- 删除确认模态框 -->
        <Teleport to="body">
          <Transition name="modal">
            <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="cancelDeleteComment">
              <div class="modal-content">
                <h3 class="modal-title">确认删除</h3>
                <p class="modal-desc">确定要删除这条评论吗？此操作不可撤销。</p>
                <div class="modal-actions">
                  <button class="modal-btn cancel" @click="cancelDeleteComment" :disabled="isDeleting">
                    取消
                  </button>
                  <button class="modal-btn confirm" @click="confirmDeleteComment" :disabled="isDeleting">
                    {{ isDeleting ? '删除中...' : '确认删除' }}
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>

        <!-- 图片预览大图 -->
        <Teleport to="body">
          <Transition name="image-preview">
            <div v-if="previewImageUrl" class="image-preview-overlay" @click="closeImagePreview">
              <div class="image-preview-container" @click.stop>
                <!-- 关闭按钮 -->
                <button class="image-preview-close" @click="closeImagePreview">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
                <!-- 图片 -->
                <img :src="previewImageUrl" alt="" class="image-preview-img" />
                <!-- 上一张按钮 -->
                <button
                  v-if="previewImageList.length > 1"
                  class="image-preview-nav prev"
                  @click.stop="switchPreviewImage('prev')"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
                <!-- 下一张按钮 -->
                <button
                  v-if="previewImageList.length > 1"
                  class="image-preview-nav next"
                  @click.stop="switchPreviewImage('next')"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
                <!-- 图片计数 -->
                <div v-if="previewImageList.length > 1" class="image-preview-counter">
                  {{ previewImageIndex + 1 }} / {{ previewImageList.length }}
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>

        <!-- 反馈抽屉 -->
        <FeedbackDrawer
          :is-open="isFeedbackOpen"
          :contribution-type="1"
          :target-type="2"
          :target-id="itemId"
          :current-name="detail.name"
          :current-description="detail.description"
          @close="closeFeedbackDrawer"
          @success="handleFeedbackSuccess"
        />

        <!-- 用户信息气泡 -->
        <UserProfilePopover
          v-if="showUserPopover && popoverUserId"
          :user-id="popoverUserId"
          :trigger-element="popoverTriggerElement"
          @close="closeUserPopover"
        />

        <!-- 更改历史弹窗 -->
        <Teleport to="body">
          <Transition name="modal">
            <div v-if="isHistoryOpen" class="modal-overlay" @click.self="closeHistoryModal">
              <div class="history-modal">
                <div class="history-header">
                  <h3>更改历史</h3>
                  <button class="history-close" @click="closeHistoryModal">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
                <div class="history-content">
                  <!-- 加载中 -->
                  <div v-if="isLoadingHistory" class="history-loading">
                    <div class="loading-spinner"></div>
                    <span>加载中...</span>
                  </div>
                  <!-- 空状态 -->
                  <div v-else-if="historyList.length === 0" class="history-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <p>暂无更改历史</p>
                  </div>
                  <!-- 历史列表 -->
                  <div v-else class="history-list">
                    <div v-for="item in historyList" :key="item.contributionId" class="history-item">
                      <div class="history-item-header">
                        <span class="history-type" :class="item.contributionType === 1 ? 'modify' : 'create'">
                          {{ item.contributionTypeDisplay }}
                        </span>
                        <span class="history-user">{{ item.nickname }}</span>
                        <span class="history-time">{{ formatHistoryTime(item.reviewedAt) }}</span>
                      </div>
                      <div class="history-details">
                        <div v-for="(detail, idx) in item.details" :key="idx" class="history-detail">
                          <span class="detail-field">{{ detail.fieldNameDisplay || getFieldLabel(detail.fieldName) }}</span>
                          <template v-if="detail.fieldName === 'image'">
                            <div class="detail-images">
                              <template v-if="item.contributionType === 1">
                                <img v-if="detail.oldImageUrl" :src="detail.oldImageUrl" class="detail-thumb" alt="旧图" />
                                <span v-else class="no-image">无</span>
                                <span class="arrow">→</span>
                                <img v-if="detail.newImageUrl" :src="detail.newImageUrl" class="detail-thumb" alt="新图" />
                                <span v-else class="no-image">无</span>
                              </template>
                              <template v-else>
                                <img v-if="detail.newImageUrl" :src="detail.newImageUrl" class="detail-thumb" alt="新图" />
                                <span v-else class="no-image">无</span>
                              </template>
                            </div>
                          </template>
                          <template v-else>
                            <div class="detail-text">
                              <template v-if="item.contributionType === 1 && detail.oldValue !== undefined">
                                <span class="old-text">{{ detail.oldValue || '（空）' }}</span>
                                <span class="arrow">→</span>
                                <span class="new-text">{{ detail.newValue }}</span>
                              </template>
                              <template v-else>
                                <span class="new-text">{{ detail.newValue }}</span>
                              </template>
                            </div>
                          </template>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>
      </template>

      <!-- 错误状态 -->
      <div v-else class="error-container">
        <h2>加载失败</h2>
        <p>无法获取评分项目详情</p>
        <button class="retry-btn" @click="() => loadDetail()">重试</button>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* ===== Base ===== */
.page-container {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--color-bg);
  color: var(--color-text);
  display: flex;
  flex-direction: column;
}

.page-content {
  flex: 1;
  padding: var(--spacing-sm);
  padding-bottom: 70px;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

/* ===== Item Header Card ===== */
.item-header-card {
  padding: var(--spacing-md);
  background: var(--color-card);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-sm);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.item-header {
  display: flex;
  gap: var(--spacing-md);
}

.item-image-wrapper {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.item-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.item-image-placeholder svg {
  width: 24px;
  height: 24px;
  opacity: 0.8;
}

.item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

.item-name {
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  line-height: 1.3;
}

.item-breadcrumb {
  font-size: 11px;
  color: var(--color-primary);
}

.item-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ===== Feedback Button ===== */
.feedback-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  width: 100%;
  margin-top: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  background: var(--color-bg);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.feedback-btn:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.feedback-btn svg {
  width: 14px;
  height: 14px;
}

/* ===== Item Actions ===== */
.item-actions {
  display: flex;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-sm);
}

.item-actions .feedback-btn {
  flex: 1;
  margin-top: 0;
}

.history-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  background: var(--color-bg);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.history-btn:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background: var(--color-primary-bg);
}

.history-btn svg {
  width: 14px;
  height: 14px;
}

/* ===== Score Card ===== */
.score-card {
  padding: var(--spacing-md);
  background: var(--color-card);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-sm);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.score-content {
  display: flex;
  gap: var(--spacing-md);
  align-items: stretch;
}

.score-main {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 70px;
  padding: var(--spacing-xs) var(--spacing-sm);
}

.score-value {
  font-size: 28px;
  font-weight: var(--font-bold);
  color: #ffc94d;
  line-height: 1;
}

.rating-count {
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: 6px;
  white-space: nowrap;
}

/* 垂直分隔线 */
.score-divider-vertical {
  width: 1px;
  background: rgba(0, 0, 0, 0.06);
  align-self: stretch;
}

.score-distribution {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  justify-content: center;
  padding-left: var(--spacing-sm);
}

.dist-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dist-stars {
  display: flex;
  gap: 0;
  flex-shrink: 0;
}

.dist-star-icon {
  width: 10px;
  height: 10px;
  color: #ffc94d;
}

.dist-star-icon.inactive {
  opacity: 0.2;
}

.dist-bar-wrapper {
  flex: 1;
  height: 6px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.dist-bar {
  height: 100%;
  background: #3b9dff;
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

/* 水平分隔线 */
.score-divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.06);
  margin: var(--spacing-sm) 0;
}

/* 用户评分行 */
.user-rating-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.user-rating-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.user-rating-stars {
  display: flex;
  align-items: center;
  gap: 4px;
}

.section-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-md);
}

.star-btn {
  width: 16px;
  height: 16px;
  padding: 0;
  background: transparent;
  border: none;
  color: rgba(0, 0, 0, 0.15);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.star-btn:hover,
.star-btn.active {
  color: #ffc94d;
  transform: scale(1.1);
}

.star-btn.submitting {
  pointer-events: none;
  opacity: 0.6;
}

.star-btn svg {
  width: 100%;
  height: 100%;
}

.submit-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  align-self: flex-end;
}

.submit-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-btn.small {
  padding: var(--spacing-xs) var(--spacing-md);
}

/* ===== Comments Section ===== */
.comments-section {
  padding: var(--spacing-md);
  background: var(--color-card);
  border-radius: var(--radius-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.comments-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.comments-count {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.sort-tabs {
  display: flex;
  gap: var(--spacing-xs);
}

.sort-tab {
  padding: 4px 8px;
  font-size: 11px;
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.sort-tab:hover {
  color: var(--color-text);
}

.sort-tab.active {
  color: var(--color-primary);
  font-weight: var(--font-medium);
}

.empty-comments {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

/* ===== Comment Card ===== */
.comment-card {
  padding: var(--spacing-md);
  background: var(--color-bg);
  border-radius: var(--radius-md);
}

.comment-main {
  display: flex;
  gap: var(--spacing-sm);
}

.comment-avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  border-radius: var(--radius-full);
}

.comment-avatar.small {
  width: 24px;
  height: 24px;
  font-size: 10px;
}

.comment-avatar.has-avatar {
  background: transparent;
  overflow: hidden;
}

.comment-avatar .avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.comment-avatar.clickable {
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);
}

.comment-avatar.clickable:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.comment-avatar.clickable:active {
  transform: scale(1.05);
}

.comment-body {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-bottom: 4px;
}

.comment-nickname {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text);
}

.commenter-stars {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  margin-left: auto;
}

.commenter-stars .star-icon {
  width: 12px;
  height: 12px;
  fill: var(--color-border);
  stroke: none;
}

.commenter-stars .star-icon.filled {
  fill: var(--color-warning);
}

.comment-time {
  font-size: 11px;
  color: var(--color-text-placeholder);
}

.comment-text {
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--color-text);
  word-break: break-word;
}

.reply-to {
  color: var(--color-primary);
  font-weight: 500;
}

.comment-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--spacing-xs);
}

.comment-actions {
  display: flex;
  gap: var(--spacing-md);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color var(--transition-fast);
}

.action-btn:hover {
  color: var(--color-text);
}

.action-btn.liked {
  color: var(--color-primary);
}

.action-btn.delete:hover {
  color: var(--color-error);
}

.action-btn svg {
  width: 14px;
  height: 14px;
}

/* ===== Replies Preview ===== */
.replies-preview {
  margin-top: var(--spacing-sm);
  margin-left: 40px;
  padding: var(--spacing-sm);
  background: rgba(0, 0, 0, 0.02);
  border-radius: var(--radius-md);
}

.reply-preview-item {
  font-size: var(--text-xs);
  line-height: 1.5;
  margin-bottom: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.reply-preview-item:last-of-type {
  margin-bottom: 0;
}

.reply-author {
  color: var(--color-primary);
  font-weight: var(--font-medium);
  margin-right: 6px;
}

.reply-text {
  color: var(--color-text-secondary);
}

.view-replies-btn {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: var(--spacing-xs);
  padding: 0;
  font-size: var(--text-xs);
  color: var(--color-primary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.view-replies-btn:hover {
  opacity: 0.8;
}

.view-replies-btn svg {
  width: 14px;
  height: 14px;
}

/* ===== Reply Input ===== */
.reply-input-wrapper {
  margin-left: 40px;
  margin-top: var(--spacing-sm);
}

.reply-input {
  width: 100%;
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-sm);
  color: var(--color-text);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  resize: none;
}

.reply-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.reply-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-xs);
  margin-top: var(--spacing-xs);
}

.cancel-btn {
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.cancel-btn:hover {
  border-color: var(--color-text-secondary);
}

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
  min-height: 80vh;
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

.drawer-original-comment {
  display: flex;
  gap: var(--spacing-sm);
  padding-bottom: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
}

.drawer-replies-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-md);
}

.drawer-replies-count {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.drawer-replies {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.drawer-reply-item {
  display: flex;
  gap: var(--spacing-sm);
}

/* Drawer Transition */
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

.cancel-reply-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  cursor: pointer;
  white-space: nowrap;
}

.cancel-reply-btn:hover {
  border-color: var(--color-text-secondary);
}

/* Drawer Input Bar */
.drawer-input-bar {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

/* ===== Error State ===== */
.error-container {
  text-align: center;
  padding: var(--spacing-2xl);
}

.error-container h2 {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  margin-bottom: var(--spacing-sm);
}

.error-container p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
}

.retry-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-sm);
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.retry-btn:hover {
  background: var(--color-primary);
  color: white;
}

/* ===== Skeleton Loading ===== */
.skeleton-header {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-card);
  border-radius: var(--radius-lg);
}

.skeleton-image {
  width: 56px;
  height: 56px;
  background: var(--color-border);
  border-radius: var(--radius-md);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.skeleton-title {
  width: 60%;
  height: 18px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-breadcrumb {
  width: 80%;
  height: 14px;
  background: var(--color-border);
  border-radius: var(--radius-sm);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-score-card {
  height: 120px;
  background: var(--color-card);
  border-radius: var(--radius-lg);
  margin-bottom: var(--spacing-sm);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-comments {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.skeleton-comment {
  height: 80px;
  background: var(--color-card);
  border-radius: var(--radius-lg);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* ===== Desktop ===== */
@media (min-width: 1024px) {
  .page-content {
    padding: var(--spacing-xl);
    max-width: 900px;
  }

  .item-header-card {
    padding: var(--spacing-lg);
  }

  .item-header {
    gap: var(--spacing-lg);
  }

  .item-image-wrapper {
    width: 80px;
    height: 80px;
  }

  .item-name {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
  }

  .item-breadcrumb {
    font-size: var(--text-sm);
  }

  .item-desc {
    font-size: var(--text-sm);
  }

  .score-card {
    padding: var(--spacing-lg);
  }

  .score-content {
    gap: var(--spacing-lg);
  }

  .score-main {
    min-width: 90px;
  }

  .score-value {
    font-size: 36px;
  }

  .rating-count {
    font-size: var(--text-xs);
  }

  .score-distribution {
    gap: 6px;
  }

  .dist-star-icon {
    width: 12px;
    height: 12px;
  }

  .dist-bar-wrapper {
    height: 8px;
  }

  .user-rating-label {
    font-size: var(--text-sm);
  }

  .star-btn {
    width: 20px;
    height: 20px;
  }

  .comment-avatar {
    width: 36px;
    height: 36px;
    font-size: var(--text-sm);
  }

  .comment-avatar.small {
    width: 28px;
    height: 28px;
    font-size: var(--text-xs);
  }

  .replies-preview {
    margin-left: 44px;
  }

  .reply-input-wrapper {
    margin-left: 44px;
  }

  .bottom-input-bar {
    max-width: 900px;
    left: 50%;
    transform: translateX(-50%);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }

  .drawer-container {
    max-width: 600px;
    margin: 0 auto;
    min-height: 70vh;
    max-height: 85vh;
  }
}

/* ===== Delete Confirm Modal ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: var(--spacing-md);
}

.modal-content {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  max-width: 320px;
  width: 100%;
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-sm);
}

.modal-desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-lg);
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
}

.modal-btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.modal-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-btn.cancel {
  background: var(--color-border);
  color: var(--color-text);
}

.modal-btn.cancel:hover:not(:disabled) {
  background: var(--color-text-placeholder);
}

.modal-btn.confirm {
  background: var(--color-error);
  color: white;
}

.modal-btn.confirm:hover:not(:disabled) {
  opacity: 0.9;
}

/* Modal Transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95);
}

/* ===== History Modal ===== */
.history-modal {
  background: var(--color-card);
  border-radius: var(--radius-lg);
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.history-header h3 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin: 0;
}

.history-close {
  width: 28px;
  height: 28px;
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

.history-close:hover {
  background: var(--color-bg);
}

.history-close svg {
  width: 18px;
  height: 18px;
}

.history-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md);
}

.history-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  gap: var(--spacing-sm);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  color: var(--color-text-secondary);
}

.history-empty svg {
  width: 48px;
  height: 48px;
  opacity: 0.4;
  margin-bottom: var(--spacing-sm);
}

.history-empty p {
  font-size: var(--text-sm);
  margin: 0;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.history-item {
  padding: var(--spacing-sm);
  background: var(--color-bg);
  border-radius: var(--radius-md);
}

.history-item-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-xs);
  flex-wrap: wrap;
}

.history-type {
  padding: 2px 6px;
  font-size: 10px;
  font-weight: var(--font-medium);
  border-radius: var(--radius-sm);
}

.history-type.modify {
  color: var(--color-primary);
  background: var(--color-primary-bg);
}

.history-type.create {
  color: #10B981;
  background: rgba(16, 185, 129, 0.1);
}

.history-user {
  font-size: var(--text-xs);
  color: var(--color-text);
  font-weight: var(--font-medium);
}

.history-time {
  font-size: 10px;
  color: var(--color-text-placeholder);
  margin-left: auto;
}

.history-details {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.history-detail {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-xs);
  font-size: var(--text-xs);
}

.detail-field {
  color: var(--color-text-secondary);
  flex-shrink: 0;
  min-width: 32px;
}

.detail-field::after {
  content: '：';
}

.detail-text {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.detail-text .old-text {
  color: var(--color-text-secondary);
  text-decoration: line-through;
  word-break: break-word;
}

.detail-text .new-text {
  color: var(--color-text);
  word-break: break-word;
}

.detail-text .arrow,
.detail-images .arrow {
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}

.detail-images {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
}

.detail-thumb {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.no-image {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-hover);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 10px;
  color: var(--color-text-placeholder);
}

.modal-enter-active .history-modal,
.modal-leave-active .history-modal {
  transition: transform 0.2s ease;
}

.modal-enter-from .history-modal,
.modal-leave-to .history-modal {
  transform: scale(0.95);
}

/* ===== Comment Images ===== */
.comment-images {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-top: var(--spacing-sm);
  max-width: 300px;
}

.comment-image-item {
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  overflow: hidden;
  cursor: pointer;
  background: var(--color-bg);
  transition: transform var(--transition-fast);
}

.comment-image-item:hover {
  transform: scale(1.02);
}

.comment-image-item.single {
  grid-column: span 2;
  max-width: 200px;
  aspect-ratio: auto;
}

.comment-image-item.single .comment-image-thumb {
  max-height: 200px;
  width: auto;
  object-fit: contain;
}

.comment-image-item.double {
  grid-column: span 1;
}

.comment-image-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ===== Bottom Input Bar ===== */
.bottom-input-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--color-card);
  border-top: 1px solid var(--color-border);
  padding: var(--spacing-xs) var(--spacing-sm);
  padding-bottom: calc(var(--spacing-xs) + env(safe-area-inset-bottom, 0px));
  z-index: 100;
}

/* 图片预览区 */
.pending-images-bar {
  display: flex;
  gap: 8px;
  padding: var(--spacing-xs) 0;
  margin-bottom: var(--spacing-xs);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.pending-images-bar::-webkit-scrollbar {
  display: none;
}

.pending-image-item {
  position: relative;
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--color-bg);
}

.pending-image-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pending-image-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pending-image-overlay.error {
  background: rgba(231, 76, 60, 0.7);
  cursor: pointer;
}

.pending-image-overlay svg {
  width: 18px;
  height: 18px;
  color: white;
}

.upload-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.pending-image-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  padding: 0;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.pending-image-remove:hover {
  background: rgba(0, 0, 0, 0.8);
}

.pending-image-remove svg {
  width: 10px;
  height: 10px;
}

.add-more-image-btn {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.add-more-image-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.add-more-image-btn svg {
  width: 20px;
  height: 20px;
}

/* 图片预览动画 */
.images-slide-enter-active,
.images-slide-leave-active {
  transition: all 0.2s ease;
}

.images-slide-enter-from,
.images-slide-leave-to {
  opacity: 0;
  max-height: 0;
  margin-bottom: 0;
  padding: 0;
}

.images-slide-enter-to,
.images-slide-leave-from {
  max-height: 80px;
}

/* 输入行 */
.bottom-input-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.hidden-file-input {
  display: none;
}

/* 输入框容器（图片按钮+输入框） */
.input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  height: 32px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
  transition: border-color var(--transition-fast);
}

.input-wrapper:focus-within {
  border-color: var(--color-primary);
}

.image-select-btn {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color var(--transition-fast);
}

.image-select-btn:hover:not(:disabled) {
  color: var(--color-primary);
}

.image-select-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.image-select-btn.has-images {
  color: var(--color-primary);
}

.image-select-btn svg {
  width: 18px;
  height: 18px;
}

.bottom-input {
  flex: 1;
  height: 100%;
  padding: 0 var(--spacing-sm) 0 0;
  font-size: var(--text-xs);
  color: var(--color-text);
  background: transparent;
  border: none;
  outline: none;
}

.bottom-input::placeholder {
  color: var(--color-text-placeholder);
  font-size: var(--text-xs);
}

.bottom-send-btn {
  height: 32px;
  padding: 0 var(--spacing-md);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: white;
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.bottom-send-btn:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.bottom-send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== Image Preview Modal ===== */
.image-preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview-container {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-preview-img {
  max-width: 100%;
  max-height: 90vh;
  object-fit: contain;
  border-radius: var(--radius-md);
}

.image-preview-close {
  position: fixed;
  top: var(--spacing-md);
  right: var(--spacing-md);
  width: 40px;
  height: 40px;
  padding: 0;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background var(--transition-fast);
  z-index: 1;
}

.image-preview-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.image-preview-close svg {
  width: 24px;
  height: 24px;
}

.image-preview-nav {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  padding: 0;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.image-preview-nav:hover {
  background: rgba(255, 255, 255, 0.2);
}

.image-preview-nav.prev {
  left: var(--spacing-md);
}

.image-preview-nav.next {
  right: var(--spacing-md);
}

.image-preview-nav svg {
  width: 24px;
  height: 24px;
}

.image-preview-counter {
  position: fixed;
  bottom: var(--spacing-lg);
  left: 50%;
  transform: translateX(-50%);
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--text-sm);
  color: white;
  background: rgba(0, 0, 0, 0.5);
  border-radius: var(--radius-full);
}

/* Image Preview Transitions */
.image-preview-enter-active,
.image-preview-leave-active {
  transition: opacity 0.2s ease;
}

.image-preview-enter-from,
.image-preview-leave-to {
  opacity: 0;
}

.image-preview-enter-active .image-preview-img,
.image-preview-leave-active .image-preview-img {
  transition: transform 0.2s ease;
}

.image-preview-enter-from .image-preview-img,
.image-preview-leave-to .image-preview-img {
  transform: scale(0.9);
}

/* ===== Mobile Responsive ===== */
@media screen and (max-width: 768px) {
  .comment-images {
    max-width: 100%;
  }

  .image-preview-nav {
    width: 36px;
    height: 36px;
  }

  .image-preview-nav svg {
    width: 20px;
    height: 20px;
  }
}
</style>
