import api, { type ApiResponse } from './index'
import type {
  GradeBindingStatus,
  BindGradeRequest,
  ExamListResponse,
  ExamDetail,
} from '@/types/grade'

/**
 * 获取好分数绑定状态
 */
export function getGradeBindingStatus() {
  return api.get<ApiResponse<GradeBindingStatus>>('/grade/status')
}

/**
 * 绑定好分数账号
 */
export function bindGrade(data: BindGradeRequest) {
  return api.post<ApiResponse<GradeBindingStatus>>('/grade/bind', data)
}

/**
 * 解绑好分数账号
 */
export function unbindGrade() {
  return api.delete<ApiResponse<null>>('/grade/unbind')
}

/**
 * 获取考试列表
 */
export function getExamList(page = 1, pageSize = 10) {
  return api.get<ApiResponse<ExamListResponse>>('/grade/exams', {
    params: { page, pageSize },
  })
}

/**
 * 获取考试详情
 */
export function getExamDetail(examId: number) {
  return api.get<ApiResponse<ExamDetail>>(`/grade/exams/${examId}`)
}
