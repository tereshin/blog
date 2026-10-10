import { useT } from '@/shared/i18n'
import { BaseIcon, Button } from '@/shared/ui'
import type { CommentExtras } from '../model/useCommentExtras.ts'
export function CommentAttachments({ extras }: { extras: CommentExtras }) {
  const { t } = useT()
  if (!extras.media.length && !extras.mentions.length) return null
  return (
    <div className="flex flex-col gap-2 px-4 pb-3">
      {extras.media.length ? (
        <div className="flex flex-wrap gap-2">
          {extras.media.map((file) => (
            <div key={file.url} className="relative">
              <img src={file.url} alt={file.alt} className="h-20 w-24 rounded-lg object-cover" />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                isIconOnly
                className="absolute right-0 top-0"
                aria-label={t('comment.remove_media')}
                onPress={() => extras.removeMedia(file.url)}
              >
                <BaseIcon name="close" style="line" size={14} />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      {extras.mentions.length ? (
        <div className="flex flex-wrap gap-1">
          {extras.mentions.map((user) => (
            <Button
              key={user.user_id}
              type="button"
              size="sm"
              variant="secondary"
              aria-label={t('comment.remove_mention', { name: user.display_name })}
              onPress={() => extras.removeMention(user.user_id)}
            >
              @{user.display_name}
              <BaseIcon name="close" style="line" size={12} />
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
