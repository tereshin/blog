import {
  mediaSettingsSchema,
  storageTestResultSchema,
  updateMediaSettingsSchema,
} from '@blog/contracts'
import type { UpdateMediaSettings } from '@blog/contracts'
import { http } from '@/shared/api'

export const MEDIA_SETTINGS_KEY = ['media-settings', 'admin'] as const

export function getMediaSettings(signal?: AbortSignal) {
  return http.get('/v1/media-settings', mediaSettingsSchema, { signal })
}

export function saveMediaSettings(body: UpdateMediaSettings) {
  return http.put('/v1/media-settings', mediaSettingsSchema, {
    body: updateMediaSettingsSchema.parse(body),
  })
}

export function testMediaStorage(body: UpdateMediaSettings) {
  return http.post('/v1/media-settings/test', storageTestResultSchema, {
    body: updateMediaSettingsSchema.parse(body),
  })
}
