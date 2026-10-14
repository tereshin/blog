import { mediaUploadResponseSchema } from '@blog/contracts'
import type { MediaUploadResponse } from '@blog/contracts'
import { http } from '@/shared/api'

export function uploadCommentImage(file: File): Promise<MediaUploadResponse> {
  return http.postBinary('/v1/media', file, mediaUploadResponseSchema, { query: { kind: 'image' } })
}
