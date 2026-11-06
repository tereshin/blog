import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MediaSettings, UpdateMediaSettings } from '@blog/contracts'
import { ApiError } from '@/shared/api'
import { env } from '@/shared/config'
import { useT } from '@/shared/i18n'
import { MEDIA_SETTINGS_KEY, saveMediaSettings, testMediaStorage } from '../api/media-settings.ts'

export function useMediaSettingsForm(initial: MediaSettings) {
  const [draft, setDraft] = useState(initial)
  const [access_key, setAccessKey] = useState('')
  const [secret_key, setSecretKey] = useState('')
  const { t } = useT()
  const query_client = useQueryClient()
  const body = (): UpdateMediaSettings => ({
    compression: draft.compression,
    storage: draft.use_custom_storage
      ? {
          endpoint: draft.storage.endpoint,
          region: draft.storage.region,
          bucket: draft.storage.bucket,
          public_url: draft.storage.public_url,
          force_path_style: draft.storage.force_path_style,
          ...(access_key.trim() ? { access_key: access_key.trim() } : {}),
          ...(secret_key ? { secret_key } : {}),
        }
      : null,
  })
  const save = useMutation({
    mutationFn: () => saveMediaSettings(body()),
    onSuccess: (data) => {
      query_client.setQueryData(MEDIA_SETTINGS_KEY, data)
      setDraft(data)
      setAccessKey('')
      setSecretKey('')
      test.reset()
      if (
        !env.is_api_mock &&
        data.use_custom_storage &&
        new URL(data.storage.public_url).origin !== new URL(initial.storage.public_url).origin
      ) {
        window.location.reload()
      }
    },
  })
  const test = useMutation({ mutationFn: () => testMediaStorage(body()) })
  const resetStatus = () => {
    save.reset()
    test.reset()
  }
  const error = save.error ?? test.error
  return {
    draft,
    access_key,
    secret_key,
    save,
    test,
    is_pending: save.isPending || test.isPending,
    error: error
      ? t(
          error instanceof ApiError && error.code === 'storage_connection_failed'
            ? 'media.settings.connection_failed'
            : 'media.settings.save_failed',
        )
      : null,
    setDraft: (value: MediaSettings) => {
      setDraft(value)
      resetStatus()
    },
    setAccessKey: (value: string) => {
      setAccessKey(value)
      resetStatus()
    },
    setSecretKey: (value: string) => {
      setSecretKey(value)
      resetStatus()
    },
  }
}
