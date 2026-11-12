import {
  sidebarSchema,
  publicSidebarSchema,
  feedbackAcceptedSchema,
  feedbackUploadSchema,
} from '@blog/contracts'
import type { Sidebar, FeedbackSubmission } from '@blog/contracts'
import { http, postBinary } from '@/shared/api'
export const widgetKeys = {
  sidebar: ['widgets', 'sidebar'] as const,
  admin: ['widgets', 'admin'] as const,
}
export const getSidebar = (signal?: AbortSignal) =>
  http.get('/v1/sidebar', publicSidebarSchema, { signal })
export const getAdminSidebar = (signal?: AbortSignal) =>
  http.get('/v1/admin/sidebar', sidebarSchema, { signal })
export const saveSidebar = (config: Sidebar, key: string) =>
  http.put('/v1/admin/sidebar', sidebarSchema, {
    body: { sections: config.sections, expected_version: config.version },
    idempotency_key: key,
  })
export const submitFeedback = (input: FeedbackSubmission, key: string) =>
  http.post('/v1/widget-feedback', feedbackAcceptedSchema, { body: input, idempotency_key: key })
export const uploadFeedbackFile = (file: File, token: string, key: string) =>
  postBinary('/v1/feedback-uploads', file, feedbackUploadSchema, {
    headers: { 'X-Upload-Token': token, 'X-File-Name': encodeURIComponent(file.name) },
    idempotency_key: key,
  })
