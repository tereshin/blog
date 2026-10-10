import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useViewer } from '@/entities/session'
import { ApiError } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { Button, Dialog, Menu, MoreIcon, useToast } from '@/shared/ui'
import { useDeleteArticle } from '../model/useDeleteArticle.ts'

type OwnArticleMenuProps = { article_id: string }

/** Меню своей статьи: правка открывает редактор, удаление спрашивает подтверждение. */
export function OwnArticleMenu({ article_id }: OwnArticleMenuProps) {
  const { t } = useT()
  const navigate = useNavigate()
  const { pathname, search, hash } = useLocation()
  const { viewer } = useViewer()
  const toast = useToast()
  const remove = useDeleteArticle()
  const [is_open, setOpen] = useState(false)

  const confirm = () => {
    remove.mutate(article_id, {
      onSuccess: () => {
        setOpen(false)
        if (!pathname.startsWith('/p/') || viewer.status !== 'member') return
        const address = viewer.profile.slug || String(viewer.user.public_number)
        navigate(`/u/${address}`)
      },
      onError: (error) => toast.error(error instanceof ApiError ? error.message : t('toast.failed')),
    })
  }

  return (
    <>
      <Menu>
        <Button variant="ghost" isIconOnly aria-label={t('editor.menu')}>
          <MoreIcon className="size-6" />
        </Button>
        <Menu.Content>
          <Menu.Item onPress={() => navigate(`/write/${article_id}`, { state: { editor_return_to: pathname + search + hash } })}>{t('common.edit')}</Menu.Item>
          <Menu.Item onPress={() => setOpen(true)}>{t('common.delete')}</Menu.Item>
        </Menu.Content>
      </Menu>
      <Dialog is_open={is_open} onOpenChange={setOpen}>
        <Dialog.Header>
          <Dialog.Heading>{t('editor.delete_title')}</Dialog.Heading>
        </Dialog.Header>
        <Dialog.Body>
          <p className="text-muted">{t('editor.delete_body')}</p>
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="ghost" slot="close">
            {t('common.cancel')}
          </Button>
          <Button variant="primary" isDisabled={remove.isPending} onPress={confirm}>
            {t('common.delete')}
          </Button>
        </Dialog.Footer>
      </Dialog>
    </>
  )
}
