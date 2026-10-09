import { useT } from '@/shared/i18n'
import { useToast } from '@/shared/ui'

/** Копирует адрес статьи `/p/{slug}` и подтверждает это всплывающим сообщением. */
export function useShareArticle(slug: string): () => void {
  const toast = useToast()
  const { t } = useT()
  return () => {
    const url = `${window.location.origin}/p/${encodeURIComponent(slug)}`
    void navigator.clipboard.writeText(url).then(
      () => toast.success(t('article.link_copied')),
      () => toast.error(t('toast.failed')),
    )
  }
}
