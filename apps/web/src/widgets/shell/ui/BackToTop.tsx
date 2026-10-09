import { useT } from '@/shared/i18n'
import { ArrowUpIcon, Button } from '@/shared/ui'
import { useShellStore } from '../model/useShellStore.ts'

function scrollShellToTop(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

/**
 * Круглая кнопка внизу слева. В покое не рендерится и не занимает место колонок.
 * Читает только булев срез: прокручен центр или нет.
 */
export function BackToTop() {
  const { t } = useT()
  const is_scrolled = useShellStore((state) => state.center_scroll_top > 0)
  if (!is_scrolled) return null
  return (
    <Button
      variant="secondary"
      isIconOnly
      aria-label={t('common.back_to_top')}
      className="fixed bottom-4 left-4 z-30 size-11 rounded-full shadow-lg"
      onPress={scrollShellToTop}
    >
      <ArrowUpIcon />
    </Button>
  )
}
