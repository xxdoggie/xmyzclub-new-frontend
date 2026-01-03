import api from './index'
import type { ApiResponse } from './index'

export interface FileUploadResponse {
  id: number
  fileUrl: string
  filePath: string
  fileSize: number
  fileType: string
  originalName: string
}

export interface GetFileUrlResponse {
  fileUrl: string
  exists: boolean
}

/**
 * 上传文件
 * POST /files/upload
 */
export function uploadFile(file: File, businessType?: string, businessId?: number) {
  const formData = new FormData()
  formData.append('file', file)
  if (businessType) {
    formData.append('business_type', businessType)
  }
  if (businessId) {
    formData.append('business_id', businessId.toString())
  }

  return api.post<ApiResponse<FileUploadResponse>>('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

/**
 * 获取文件 URL
 * POST /files/get-url
 */
export function getFileUrl(businessType: string, businessId: number) {
  return api.post<ApiResponse<GetFileUrlResponse>>('/files/get-url', {
    businessType,
    businessId,
  })
}

/**
 * 删除文件
 * DELETE /files/{id}
 */
export function deleteFile(id: number) {
  return api.delete<ApiResponse<{ message: string }>>(`/files/${id}`)
}

/**
 * 按业务删除文件
 * DELETE /files/business/{businessType}/{businessId}
 */
export function deleteFileByBusiness(businessType: string, businessId: number) {
  return api.delete<ApiResponse<{ message: string }>>(`/files/business/${businessType}/${businessId}`)
}
