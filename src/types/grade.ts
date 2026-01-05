/**
 * 好分数绑定状态
 */
export interface GradeBindingStatus {
  bound: boolean
  account: string | null
  name: string | null
  studentId: string | null
  roleType: number | null
  bindTime: string | null
}

/**
 * 绑定好分数请求
 */
export interface BindGradeRequest {
  account: string
  password: string
  roleType: number // 1-学生，2-家长
}

/**
 * 考试列表项
 */
export interface ExamListItem {
  examId: number
  name: string
  time: number // 毫秒级时间戳
  type: number // 3-月考，5-会考
  score: number
  manfen: number // 满分
  classRank: number
  gradeRank: number
  className: string
}

/**
 * 考试列表响应
 */
export interface ExamListResponse {
  list: ExamListItem[]
  totalCount: number
  page: number
  pageSize: number
}

/**
 * 排名信息
 */
export interface RankInfo {
  classRank: number
  classStuNum: number
  classDefeatRatio: number
  gradeRank: number
  gradeStuNum: number
  gradeDefeatRatio: number
}

/**
 * 对比信息
 */
export interface CompareInfo {
  classHighest: number | null
  classAvg: number | null
  gradeHighest: number | null
  gradeAvg: number | null
}

/**
 * 科目成绩
 */
export interface SubjectScore {
  paperId: string
  subject: string
  score: number
  manfen: number
}

/**
 * 考试详情
 */
export interface ExamDetail {
  examId: number
  name: string
  time: number
  type: number
  score: number
  manfen: number
  rankInfo: RankInfo
  compareInfo: CompareInfo
  subjects: SubjectScore[]
}

/**
 * 考试类型映射
 */
export const ExamTypeMap: Record<number, string> = {
  3: '月考',
  5: '会考',
}

/**
 * 获取考试类型名称
 */
export function getExamTypeName(type: number): string {
  return ExamTypeMap[type] || '其他'
}
