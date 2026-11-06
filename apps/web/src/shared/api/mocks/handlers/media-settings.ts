import { HttpResponse, http } from 'msw'
import {
  imageCompressionSchema,
  mediaSettingsSchema,
  s3SettingsSchema,
  updateMediaSettingsSchema,
} from '@blog/contracts'
import type { MediaSettings } from '@blog/contracts'
import { readMockViewer } from './session.ts'

const SERVER_STORAGE = {
  endpoint: 'http://localhost:9000',
  bucket: 'media',
  region: 'us-east-1',
  public_url: 'http://localhost:9000/media',
  force_path_style: true,
  has_credentials: true,
}
let settings: MediaSettings = {
  compression: imageCompressionSchema.parse({}),
  storage: SERVER_STORAGE,
  use_custom_storage: false,
}

function forbidden() {
  return readMockViewer() === 'superadmin'
    ? null
    : HttpResponse.json({ code: 'forbidden' }, { status: 403 })
}

export const mediaSettingsHandlers = [
  http.get('*/v1/media-settings', () => forbidden() ?? HttpResponse.json(settings)),
  http.put('*/v1/media-settings', async ({ request }) => {
    const denied = forbidden()
    if (denied) return denied
    const input = updateMediaSettingsSchema.safeParse(await request.json())
    if (!input.success) return HttpResponse.json({ code: 'validation_failed' }, { status: 422 })
    // Mocks keep only public values in memory, never credential input.
    settings = mediaSettingsSchema.parse({
      compression: input.data.compression,
      storage: input.data.storage
        ? { ...s3SettingsSchema.strip().parse(input.data.storage), has_credentials: true }
        : SERVER_STORAGE,
      use_custom_storage: Boolean(input.data.storage),
    })
    return HttpResponse.json(settings)
  }),
  http.post('*/v1/media-settings/test', async ({ request }) => {
    const denied = forbidden()
    if (denied) return denied
    const input = updateMediaSettingsSchema.safeParse(await request.json())
    return input.success
      ? HttpResponse.json({ ok: true })
      : HttpResponse.json({ code: 'validation_failed' }, { status: 422 })
  }),
]
