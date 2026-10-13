import { useRef } from 'react'
import { useT } from '@/shared/i18n'
import { BaseIcon, Button } from '@/shared/ui'
import type { CommentExtras as Extras } from '../model/useCommentExtras.ts'

type CommentExtrasProps = {
  extras: Extras
  authorize: (action: () => void) => void
  onMention: () => void
  can_mention: boolean
}

export function CommentExtras({ extras, authorize, onMention, can_mention }: CommentExtrasProps) {
  const { t } = useT()
  const image_ref = useRef<HTMLInputElement>(null)
  const gif_ref = useRef<HTMLInputElement>(null)
  const is_disabled = extras.is_uploading || extras.media.length >= 4
  return (
    <div className="comment-composer__extras">
      <input
        ref={image_ref}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) extras.upload(file)
          event.target.value = ''
        }}
      />
      <input
        ref={gif_ref}
        type="file"
        accept="image/gif"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) extras.upload(file)
          event.target.value = ''
        }}
      />
      <Button
        type="button"
        variant="ghost"
        isIconOnly
        className="comment-composer__action"
        aria-label={t('comment.add_image')}
        isDisabled={is_disabled}
        onPress={() => authorize(() => image_ref.current?.click())}
      >
        <BaseIcon name="pic" style="line" size={20} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        isIconOnly
        className="comment-composer__action"
        aria-label={t('comment.add_gif')}
        isDisabled={is_disabled}
        onPress={() => authorize(() => gif_ref.current?.click())}
      >
        <span aria-hidden="true" className="text-sm font-semibold">
          {t('comment.gif')}
        </span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        isIconOnly
        className="comment-composer__action"
        aria-label={t('comment.add_mention')}
        isDisabled={!can_mention}
        onPress={onMention}
      >
        <BaseIcon name="at" style="line" size={22} />
      </Button>
      {extras.is_uploading ? (
        <span role="status" className="sr-only">
          {t('comment.uploading')}
        </span>
      ) : null}
    </div>
  )
}
