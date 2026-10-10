import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'
import { useUploadMedia } from '../model/useUploadMedia.ts'

type ImageUploadButtonProps = {
  label: string
  onUploaded: (url: string) => void | Promise<void>
  children?: ReactNode
  className?: string
  container_className?: string
  is_disabled?: boolean
}

export function ImageUploadButton({ label, onUploaded, children, className, container_className, is_disabled = false }: ImageUploadButtonProps) {
  const { t } = useT()
  const input_ref = useRef<HTMLInputElement>(null)
  const [is_saving, setSaving] = useState(false)
  const [has_save_error, setSaveError] = useState(false)
  const { state, upload } = useUploadMedia()

  return (
    <div className={cn('flex flex-col gap-1', container_className)}>
      <input
        ref={input_ref}
        disabled={is_disabled || is_saving || state.status === 'uploading'}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) return
          setSaveError(false)
          void upload(file, 'image').then(async (uploaded) => {
            if (!uploaded) return
            setSaving(true)
            try {
              await onUploaded(uploaded.url)
            } catch {
              setSaveError(true)
            } finally {
              setSaving(false)
            }
          })
        }}
      />
      <Button type="button" variant="secondary" className={className} aria-label={label}
        isDisabled={is_disabled || is_saving || state.status === 'uploading'}
        onPress={() => input_ref.current?.click()}>
        {children ?? (state.status === 'uploading' ? t('upload.uploading') : is_saving ? t('profile.saving') : label)}
      </Button>
      {has_save_error ? <p role="alert" className="text-sm text-danger">{t('profile.error.save')}</p> : null}
      {state.status === 'error' ? <p className="text-sm text-danger">{state.reason === 'upload_failed' ? t('upload.failed') : state.reason}</p> : null}
    </div>
  )
}
