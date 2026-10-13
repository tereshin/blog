import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { mediaUploadResponseSchema } from '@blog/contracts'
import { http } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { useToast } from '@/shared/ui'
export function useCommentExtras() {
  const { t } = useT()
  const toast = useToast()
  const [media, setMedia] = useState<{ url: string; alt: string }[]>([])
  const upload = useMutation({
    mutationFn: (file: File) =>
      http.postBinary('/v1/media', file, mediaUploadResponseSchema, { query: { kind: 'image' } }),
    onSuccess: (file) => setMedia((items) => [...items, { url: file.url, alt: '' }].slice(0, 4)),
    onError: () => toast.error(t('comment.upload_failed')),
  })
  return {
    media,
    is_uploading: upload.isPending,
    upload: (file: File) => {
      if (
        media.length >= 4 ||
        file.size > 8 * 1024 * 1024 ||
        !['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)
      ) {
        toast.error(t('comment.media_limit'))
        return
      }
      upload.mutate(file)
    },
    removeMedia: (url: string) => setMedia((items) => items.filter((item) => item.url !== url)),
    clear: () => {
      setMedia([])
    },
  }
}
export type CommentExtras = ReturnType<typeof useCommentExtras>
