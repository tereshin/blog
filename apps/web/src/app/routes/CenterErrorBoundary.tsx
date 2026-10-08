import { Component } from 'react'
import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { ErrorState } from '@/shared/ui'

type CenterErrorBoundaryProps = { children: ReactNode }
type CenterErrorBoundaryState = { has_error: boolean }

function CenterError({ onRetry }: { onRetry: () => void }) {
  const { t } = useT()
  return <ErrorState title={t('shell.center.error_title')} description={t('shell.center.error_hint')} onRetry={onRetry} className="py-16" />
}

/**
 * Ошибка раздела остаётся в центре: шапка и обе карточки не затрагиваются.
 * Переход на другой адрес сбрасывает ошибку: `ShellLayout` задаёт границе `key` по адресу.
 */
export class CenterErrorBoundary extends Component<CenterErrorBoundaryProps, CenterErrorBoundaryState> {
  override state: CenterErrorBoundaryState = { has_error: false }

  static getDerivedStateFromError(): CenterErrorBoundaryState {
    return { has_error: true }
  }

  override render(): ReactNode {
    if (this.state.has_error) return <CenterError onRetry={() => this.setState({ has_error: false })} />
    return this.props.children
  }
}
