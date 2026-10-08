import { useId } from 'react'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'
import { useUploadMedia } from '../model/useUploadMedia.ts'

type ImageUploadButtonProps = {
  label: string
  onUploaded: (url: string) => void
}

export function ImageUploadButton({ label, onUploaded }: ImageUploadButtonProps) {
  const { t } = useT()
  const input_id = useId()
  const { state, upload } = useUploadMedia()

  return (
    <div className="flex flex-col gap-1">
      <input
        id={input_id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          void upload(file, 'image').then((uploaded) => {
            if (uploaded) onUploaded(uploaded.url)
          })
        }}
      />
      <Button variant="secondary" onPress={() => document.getElementById(input_id)?.click()}>
        {state.status === 'uploading' ? t('upload.uploading') : label}
      </Button>
      {state.status === 'error' ? <p className="text-sm text-danger">{state.reason === 'upload_failed' ? t('upload.failed') : state.reason}</p> : null}
    </div>
  )
}
