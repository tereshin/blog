import { useState } from 'react'
import { ApiError } from '@/shared/api'
import { uploadMedia } from '../api/upload-media.ts'
import type { UploadedMedia } from '../api/upload-media.ts'

export type UploadState = { status: 'idle' } | { status: 'uploading' } | { status: 'error'; reason: string }

export function useUploadMedia() {
  const [state, setState] = useState<UploadState>({ status: 'idle' })

  async function upload(file: File, kind: 'image' | 'attachment'): Promise<UploadedMedia | null> {
    setState({ status: 'uploading' })
    try {
      const uploaded = await uploadMedia(file, kind)
      setState({ status: 'idle' })
      return uploaded
    } catch (error) {
      const reason = error instanceof ApiError ? (error.detail ?? error.message) : 'upload_failed'
      setState({ status: 'error', reason })
      return null
    }
  }

  return { state, upload }
}
