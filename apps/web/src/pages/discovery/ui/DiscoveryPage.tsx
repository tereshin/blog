import { useRef } from 'react'
import { useT } from '@/shared/i18n'
import { BaseIcon, Button, Card, ErrorState, Input, SearchIcon, Skeleton } from '@/shared/ui'
import { DiscoveryOverview } from '@/widgets/discovery'
import { useDiscoverySearch } from '../model/useDiscoverySearch.ts'
import { DiscoverySearchResults } from './DiscoverySearchResults.tsx'

export default function DiscoveryPage() {
  const { t } = useT()
  const { q, setQuery, search } = useDiscoverySearch()
  const input_ref = useRef<HTMLInputElement>(null)
  const is_overview = q.trim().length === 0
  return (
    <Card className="mx-auto max-w-[var(--shell-content-width,640px)] gap-0">
      <Card.Header className="border-b border-border px-5 py-3">
        <h1 className="sr-only">{t('discovery.title')}</h1>
        <form
          role="search"
          className="w-full"
          onSubmit={(event) => {
            event.preventDefault()
            setQuery(q.trim(), false)
          }}
        >
          <Input
            ref={input_ref}
            type="search"
            size="lg"
            variant="secondary"
            value={q}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('header.search_placeholder')}
            aria-label={t('header.search')}
            maxLength={100}
            autoComplete="off"
            enterKeyHint="search"
            prefix={<SearchIcon className="shrink-0 text-muted" />}
            suffix={
              q ? (
                <Button
                  variant="ghost"
                  isIconOnly
                  aria-label={t('header.search_clear_query')}
                  className="size-8 min-w-8"
                  onPress={() => {
                    setQuery('')
                    input_ref.current?.focus()
                  }}
                >
                  <BaseIcon name="close" />
                </Button>
              ) : null
            }
          />
        </form>
      </Card.Header>
      <Card.Content className="px-4 lg:px-5 py-3 lg:py-5">
        {is_overview ? (
          <DiscoveryOverview />
        ) : q.trim().length < 2 ? (
          <p role="status" className="py-4 text-muted">
            {t('header.search_min_length')}
          </p>
        ) : q.trim().length > 100 ? (
          <p role="status">{t('discovery.query_too_long')}</p>
        ) : (
          <>
            {search.is_searching ? (
              <div role="status" aria-label={t('common.loading')}>
                <Skeleton className="h-20" />
              </div>
            ) : null}
            {search.isError ? (
              <ErrorState title={t('search.error')} onRetry={() => void search.refetch()} />
            ) : null}
            {search.data ? <DiscoverySearchResults pages={search.data.pages} /> : null}
            {search.data && search.hasNextPage ? (
              <Button
                variant="ghost"
                className="mt-4 w-full"
                isDisabled={search.isFetchingNextPage}
                onPress={() => void search.fetchNextPage()}
              >
                {t('common.more')}
              </Button>
            ) : null}
          </>
        )}
      </Card.Content>
    </Card>
  )
}
