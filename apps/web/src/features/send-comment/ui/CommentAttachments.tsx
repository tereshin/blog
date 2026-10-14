import { useT } from '@/shared/i18n'
import { CloseButton } from '@/shared/ui'
import type { CommentExtras } from '../model/useCommentExtras.ts'
export function CommentAttachments({ extras }: { extras: CommentExtras }) {
  const { t } = useT()
  if (!extras.media.length) return null
  return (
    <div className="comment-composer__attachments flex flex-col gap-2">
      {extras.media.length ? (
        <div className="flex flex-wrap gap-2">
          {extras.media.map((file) => (
            <div key={file.url} className="relative">
              <img loading="lazy" src={file.url} alt={file.alt} className="h-20 w-24 rounded-lg object-cover" />
              <CloseButton
                type="button"
                className="absolute right-0 top-0"
                aria-label={t('comment.remove_media')}
                onPress={() => extras.removeMedia(file.url)}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
