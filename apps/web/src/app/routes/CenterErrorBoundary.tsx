import { Component, useCallback } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useT } from '@/shared/i18n'
import { reportClientError } from '@/shared/lib'
import { ErrorState } from '@/shared/ui'

type CenterErrorBoundaryProps = { children: ReactNode }
type CenterErrorBoundaryState = { has_error: boolean }
type InnerProps = { children: ReactNode; refetch: () => void }

function CenterError({ onRetry }: { onRetry: () => void }) {
  const { t } = useT()
  return <ErrorState title={t('shell.center.error_title')} description={t('shell.center.error_hint')} onRetry={onRetry} className="py-16" />
}

/**
 * Ошибка раздела остаётся в центре: шапка и обе карточки не затрагиваются.
 * Переход на другой адрес сбрасывает ошибку: `ShellLayout` задаёт границе `key` по адресу.
 */
class CenterErrorBoundaryInner extends Component<InnerProps, CenterErrorBoundaryState> {
  override state: CenterErrorBoundaryState = { has_error: false }

  static getDerivedStateFromError(): CenterErrorBoundaryState {
    return { has_error: true }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    reportClientError({ message: error.message, component_stack: info.componentStack })
  }

  resetErrorBoundary = (): void => {
    this.setState({ has_error: false })
  }

  retry = (): void => {
    this.resetErrorBoundary()
    this.props.refetch()
  }

  override render(): ReactNode {
    if (this.state.has_error) return <CenterError onRetry={this.retry} />
    return this.props.children
  }
}

export function CenterErrorBoundary({ children }: CenterErrorBoundaryProps) {
  const query_client = useQueryClient()
  const refetch = useCallback(() => {
    void query_client.refetchQueries()
  }, [query_client])
  return <CenterErrorBoundaryInner refetch={refetch}>{children}</CenterErrorBoundaryInner>
}
