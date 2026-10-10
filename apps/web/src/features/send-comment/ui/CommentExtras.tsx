import { useRef, useState } from 'react'
import { useCommentMentionSearch } from '../model/useCommentMentionSearch.ts'
import { useT } from '@/shared/i18n'
import { Avatar, BaseIcon, Button, Dialog, ErrorState } from '@/shared/ui'
import type { CommentExtras as Extras } from '../model/useCommentExtras.ts'
export function CommentExtras({
  extras,
  authorize,
}: {
  extras: Extras
  authorize: (action: () => void) => void
}) {
  const { t } = useT()
  const image_ref = useRef<HTMLInputElement>(null)
  const gif_ref = useRef<HTMLInputElement>(null)
  const [is_open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const query = useCommentMentionSearch(search, is_open)
  return (
    <div className="shrink-0">
      <div className="flex items-center gap-0.5 text-muted">
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
          size="sm"
          variant="ghost"
          isIconOnly
          aria-label={t('comment.add_image')}
          isDisabled={extras.is_uploading || extras.media.length >= 4}
          onPress={() => authorize(() => image_ref.current?.click())}
        >
          <BaseIcon name="pic" style="line" size={20} />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          isIconOnly
          aria-label={t('comment.add_gif')}
          isDisabled={extras.is_uploading || extras.media.length >= 4}
          onPress={() => authorize(() => gif_ref.current?.click())}
        >
          <span aria-hidden="true" className="text-xs font-semibold">
            {t('comment.gif')}
          </span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          isIconOnly
          aria-label={t('comment.add_mention')}
          isDisabled={extras.mentions.length >= 10}
          onPress={() => authorize(() => setOpen(true))}
        >
          <span aria-hidden="true">@</span>
        </Button>
        {extras.is_uploading ? (
          <span role="status" className="sr-only">
            {t('comment.uploading')}
          </span>
        ) : null}
      </div>
      <Dialog is_open={is_open} onOpenChange={setOpen}>
        <Dialog.Header>
          <Dialog.Heading>{t('comment.add_mention')}</Dialog.Heading>
        </Dialog.Header>
        <Dialog.Body>
          <label className="flex flex-col gap-2 text-sm">
            {t('comment.find_member')}
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              maxLength={100}
              className="rounded-xl border border-separator bg-surface-secondary p-3"
            />
          </label>
          {search.trim() && query.isPending ? (
            <p role="status" className="mt-3">
              {t('common.loading')}
            </p>
          ) : null}
          {query.isError ? (
            <ErrorState title={t('error.unknown')} onRetry={() => void query.refetch()} />
          ) : null}
          <ul className="mt-3 flex flex-col gap-1">
            {query.data?.map((user) => (
              <li key={user.user_id}>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onPress={() => {
                    extras.addMention(user)
                    setOpen(false)
                  }}
                >
                  <Avatar size="sm" name={user.display_name} src={user.avatar_url} />
                  {user.display_name}
                </Button>
              </li>
            ))}
          </ul>
          {query.isSuccess && !query.data.length ? (
            <p className="mt-3 text-sm text-muted">{t('comment.members_empty')}</p>
          ) : null}
        </Dialog.Body>
        <Dialog.Footer>
          <Button slot="close" variant="ghost">
            {t('common.close')}
          </Button>
        </Dialog.Footer>
      </Dialog>
    </div>
  )
}
