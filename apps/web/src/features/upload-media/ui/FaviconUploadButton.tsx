import { useRef } from 'react'
import type { FaviconVariant } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'
import { useUploadMedia } from '../model/useUploadMedia.ts'
const ACCEPT: Record<FaviconVariant, string> = {
  png: 'image/png',
  apple: 'image/png',
  svg: '.svg,image/svg+xml',
  ico: '.ico,image/x-icon,image/vnd.microsoft.icon',
  manifest: '.webmanifest,.json,application/manifest+json,application/json',
}
export function FaviconUploadButton({
  label,
  variant,
  onUploaded,
  is_disabled,
}: {
  label: string
  variant: FaviconVariant
  onUploaded: (url: string) => void
  is_disabled?: boolean
}) {
  const { t } = useT()
  const input_ref = useRef<HTMLInputElement>(null)
  const { state, upload } = useUploadMedia()
  return (
    <div className="flex flex-col gap-2">
      <input
        type="file"
        hidden
        ref={input_ref}
        accept={ACCEPT[variant]}
        disabled={is_disabled || state.status === 'uploading'}
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file)
            void upload(file, 'favicon', variant).then((result) => {
              if (result) onUploaded(result.url)
            })
        }}
      />
      <Button
        type="button"
        variant="secondary"
        isDisabled={is_disabled || state.status === 'uploading'}
        onPress={() => input_ref.current?.click()}
      >
        {state.status === 'uploading' ? t('upload.uploading') : label}
      </Button>
      {state.status === 'error' ? (
        <p role="alert" className="text-sm text-danger">
          {state.reason === 'upload_failed' ? t('upload.failed') : state.reason}
        </p>
      ) : null}
    </div>
  )
}
