import api from './index'
import type { ApiResponse } from './index'
import type { School, MajorSection, MinorSection } from '@/types/rating'

/**
 * 获取学校列表
 */
export function getSchools() {
  return api.get<ApiResponse<School[]>>('/rating-community/schools')
}

/**
 * 获取学校的大分区列表
 */
export function getMajorSections(schoolId: number) {
  return api.get<ApiResponse<MajorSection[]>>(`/rating-community/schools/${schoolId}/major-sections`)
}

/**
 * 获取大分区的小分区列表
 */
export function getMinorSections(majorSectionId: number) {
  return api.get<ApiResponse<MinorSection[]>>(`/rating-community/major-sections/${majorSectionId}/minor-sections`)
}
