/**
 * 评分社区新手引导 Composable
 * 使用 driver.js 实现跨页面的用户引导功能
 */
import { ref } from 'vue'
import { driver, type Driver } from 'driver.js'
import 'driver.js/dist/driver.css'

// 引导步骤常量
export const TourStep = {
  // 主页
  HOME_COMMUNITY_ENTRY: 1,
  // 社区主页
  COMMUNITY_EXPLORE: 2,
  // 小分区页面
  MINOR_SECTION_INTRO: 3,
  MINOR_SECTION_FEEDBACK: 4,
  MINOR_SECTION_CLICK: 5,
  // 评分列表页面
  RATING_LIST_INTRO: 6,
  RATING_LIST_FEEDBACK: 7,
  RATING_ITEM_CARD: 8,
  RATING_ITEM_STARS: 9,
  // 评分详情页面
  RATING_DETAIL_FEEDBACK: 10,
  // 返回社区主页继续
  COMMUNITY_HOT: 11,
  COMMUNITY_RANDOM: 12,
  COMMUNITY_REFRESH: 13,
  COMMUNITY_COLLECTION: 14,
  COMMUNITY_FINAL: 15,
  // 完成
  COMPLETED: 100,
} as const

export type TourStepType = (typeof TourStep)[keyof typeof TourStep]

// localStorage 键名
const STORAGE_KEY_STEP = 'scoring-tour-step'
const STORAGE_KEY_COMPLETED = 'scoring-tour-completed'

// 全局状态
const currentStep = ref<TourStepType>(TourStep.HOME_COMMUNITY_ENTRY)
const isCompleted = ref(false)
const driverInstance = ref<Driver | null>(null)

// 初始化：从 localStorage 恢复状态
function initTourState() {
  const completedStr = localStorage.getItem(STORAGE_KEY_COMPLETED)
  if (completedStr === 'true') {
    isCompleted.value = true
    return
  }

  const stepStr = localStorage.getItem(STORAGE_KEY_STEP)
  if (stepStr) {
    const step = parseInt(stepStr, 10)
    if (!isNaN(step)) {
      currentStep.value = step as TourStepType
    }
  }
}

// 保存当前步骤
function saveStep(step: TourStepType) {
  currentStep.value = step
  localStorage.setItem(STORAGE_KEY_STEP, step.toString())
}

// 标记引导完成
function completeTour() {
  isCompleted.value = true
  localStorage.setItem(STORAGE_KEY_COMPLETED, 'true')
  localStorage.removeItem(STORAGE_KEY_STEP)
  if (driverInstance.value) {
    driverInstance.value.destroy()
    driverInstance.value = null
  }
}

// 重置引导（用于测试）
function resetTour() {
  isCompleted.value = false
  currentStep.value = TourStep.HOME_COMMUNITY_ENTRY
  localStorage.removeItem(STORAGE_KEY_COMPLETED)
  localStorage.removeItem(STORAGE_KEY_STEP)
}

// 强制从指定步骤开始引导（忽略已完成状态）
function forceStartTour(step: TourStepType = TourStep.HOME_COMMUNITY_ENTRY) {
  isCompleted.value = false
  currentStep.value = step
  localStorage.removeItem(STORAGE_KEY_COMPLETED)
  localStorage.setItem(STORAGE_KEY_STEP, step.toString())
}

// 创建 driver 实例
function createDriver(options?: Partial<Parameters<typeof driver>[0]>): Driver {
  if (driverInstance.value) {
    driverInstance.value.destroy()
  }

  driverInstance.value = driver({
    showProgress: false,
    animate: true,
    allowClose: false, // 禁止关闭
    allowKeyboardControl: false, // 禁止键盘控制
    disableActiveInteraction: true, // 默认禁止与高亮元素交互
    overlayColor: 'rgba(0, 0, 0, 0.6)',
    stagePadding: 8,
    stageRadius: 8,
    popoverClass: 'scoring-tour-popover',
    nextBtnText: '我知道了',
    doneBtnText: '完成',
    showButtons: ['next'], // 只显示下一步按钮
    ...options,
  })

  return driverInstance.value
}

// 高亮单个元素（不自动前进）
function highlightElement(
  element: string,
  title: string,
  description: string,
  options?: {
    side?: 'top' | 'right' | 'bottom' | 'left'
    align?: 'start' | 'center' | 'end'
    nextBtnText?: string
    allowInteraction?: boolean // 是否允许与高亮元素交互
    onNextClick?: () => void
    showSkipButton?: boolean // 是否显示跳过向导按钮
  }
) {
  const driverObj = createDriver({
    nextBtnText: options?.nextBtnText ?? '我知道了',
    disableActiveInteraction: !(options?.allowInteraction ?? false),
  })

  driverObj.highlight({
    element,
    popover: {
      title,
      description,
      side: options?.side ?? 'bottom',
      align: options?.align ?? 'center',
      onNextClick: options?.onNextClick,
      onPopoverRender: options?.showSkipButton
        ? (popover) => {
            // 在 popover 底部添加跳过按钮
            const skipBtn = document.createElement('button')
            skipBtn.className = 'tour-skip-btn'
            skipBtn.textContent = '我想自己探索，退出向导'
            skipBtn.onclick = () => {
              completeTour()
              destroyDriver()
            }
            popover.wrapper.appendChild(skipBtn)
          }
        : undefined,
    },
  })

  return driverObj
}

// 显示居中弹窗（无高亮元素）
function showCenteredPopover(
  title: string,
  description: string,
  options?: {
    onNextClick?: () => void
    doneBtnText?: string
  }
) {
  const driverObj = createDriver({
    nextBtnText: options?.doneBtnText ?? '开始体验',
  })

  driverObj.highlight({
    popover: {
      title,
      description,
      onNextClick: options?.onNextClick,
    },
  })

  return driverObj
}

// 销毁当前 driver 实例
function destroyDriver() {
  if (driverInstance.value) {
    driverInstance.value.destroy()
    driverInstance.value = null
  }
}

// 检查是否应该在当前页面开始引导
function shouldStartTour(): boolean {
  initTourState()
  return !isCompleted.value
}

// 获取当前步骤
function getCurrentStep(): TourStepType {
  return currentStep.value
}

export function useScoringTour() {
  return {
    // 状态
    currentStep,
    isCompleted,
    TourStep,

    // 方法
    initTourState,
    saveStep,
    completeTour,
    resetTour,
    forceStartTour,
    createDriver,
    highlightElement,
    showCenteredPopover,
    destroyDriver,
    shouldStartTour,
    getCurrentStep,
  }
}
