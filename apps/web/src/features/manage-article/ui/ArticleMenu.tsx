import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { Button, Menu, MoreIcon } from '@/shared/ui'
import { OwnArticleMenu } from './OwnArticleMenu.tsx'

type ArticleMenuProps = {
  article_id: string
  is_own: boolean
  onCopyLink: () => void
  onReport: () => void
  /** Окно жалобы. Рендерится рядом с меню, а не внутри списка пунктов. */
  report_dialog?: ReactNode
}

/** Меню «…»: своя статья — правка и удаление, чужая — ссылка и жалоба. */
export function ArticleMenu({ article_id, is_own, onCopyLink, onReport, report_dialog }: ArticleMenuProps) {
  const { t } = useT()
  if (is_own) return <OwnArticleMenu article_id={article_id} />
  return (
    <>
      <Menu>
        <Button variant="ghost" isIconOnly aria-label={t('editor.menu')}>
          <MoreIcon width={18} height={18} />
        </Button>
        <Menu.Content>
          <Menu.Item onPress={onCopyLink}>{t('article.copy_link')}</Menu.Item>
          <Menu.Item onPress={onReport}>{t('article.report')}</Menu.Item>
        </Menu.Content>
      </Menu>
      {report_dialog}
    </>
  )
}
