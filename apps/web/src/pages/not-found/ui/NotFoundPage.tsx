import { Link } from 'react-router'
import { useT } from '@/shared/i18n'
import { EmptyState } from '@/shared/ui'

// Страница внутри каркаса: обе карточки на месте, объяснение стоит в центре.
export default function NotFoundPage() {
  const { t } = useT()
  return (
    <EmptyState title={t('error.not_found')} className="py-16">
      <Link to="/" className="text-accent underline-offset-2 hover:underline">
        {t('shell.nav.fresh')}
      </Link>
    </EmptyState>
  )
}
