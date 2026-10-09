import { ArticleMenu } from '@/features/manage-article'
import { ReportDialog, useReportDialog } from '@/features/report-article'
import { useShareArticle } from '@/features/share-article'

type ArticleOverflowMenuProps = { article_id: string; slug: string; is_own: boolean }

/** Меню «…» карточки: ссылка, жалоба или действия автора. */
export function ArticleOverflowMenu({ article_id, slug, is_own }: ArticleOverflowMenuProps) {
  const share = useShareArticle(slug)
  const report = useReportDialog()
  return (
    <ArticleMenu
      article_id={article_id}
      is_own={is_own}
      onCopyLink={share}
      onReport={report.open}
      report_dialog={<ReportDialog article_id={article_id} is_open={report.is_open} onOpenChange={report.onOpenChange} />}
    />
  )
}
