import { useQuery } from '@tanstack/react-query'
import { getSidebar, widgetKeys } from '@/entities/admin-widget'
import { AdminWidgetView } from '@/features/render-admin-widget'
import { useT } from '@/shared/i18n'
import { Card, ErrorState, Skeleton } from '@/shared/ui'
export function RightRail() {
  const { t } = useT()
  const query = useQuery({
    queryKey: widgetKeys.sidebar,
    queryFn: ({ signal }) => getSidebar(signal),
    staleTime: 30000,
  })
  if (query.isPending) return <Skeleton className="h-48 w-[320px]" />
  if (query.isError)
    return <ErrorState title={t('shell.rail.error')} onRetry={() => void query.refetch()} />
  if (!query.data.sections.length) return null
  return (
    <section aria-label={t('widgets.sidebar')} className="flex w-[320px] flex-col gap-4">
      {query.data.sections.map((section) => {
        const title =
          section.id === '1c6f716b-077a-4dad-a16f-66cc074b3d86' &&
          section.title === 'Popular comments'
            ? t('shell.rail.title')
            : section.title
        const content = (
          <div className="flex min-w-0 flex-col gap-5">
            {section.widgets.map((widget) => (
              <AdminWidgetView key={widget.id} widget={widget} />
            ))}
          </div>
        )
        return section.has_card ? (
          <Card key={section.id} className="gap-0">
            {title ? (
              <Card.Header className="px-4 pt-5 pb-3">
                <Card.Title className="text-[15px] font-medium leading-5">{title}</Card.Title>
              </Card.Header>
            ) : null}
            <Card.Content className={title ? 'px-4 pb-5 pt-0' : 'px-4 py-5'}>
              {content}
            </Card.Content>
          </Card>
        ) : (
          <section key={section.id} className="min-w-0">
            {title ? <h2 className="mb-3 text-[15px] font-medium">{title}</h2> : null}
            {content}
          </section>
        )
      })}
    </section>
  )
}
