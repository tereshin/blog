import { Modal } from '@heroui/react/modal'
import { Spinner } from '@heroui/react/spinner'
import { useT } from '@/shared/i18n'
import { BaseIcon, Button, ErrorState, SearchIcon } from '@/shared/ui'
import { useHeaderSearch } from '../model/useHeaderSearch.ts'
import { HeaderSearchResults } from './HeaderSearchResults.tsx'

/** React Aria управляет фокусом, Escape, закрытием снаружи и блокировкой прокрутки. */
export function HeaderSearch() {
  const { t } = useT()
  const {
    value,
    setValue,
    input_ref,
    search,
    closeSearch,
    recent_searches,
    clearRecentSearches,
    openResults,
    handleSelect,
    handleClear,
  } = useHeaderSearch()
  const q = value.trim()

  return (
    <Modal.Backdrop
      isOpen
      onOpenChange={(is_open) => {
        if (!is_open) closeSearch()
      }}
      className="bg-black/60"
    >
      <Modal.Container placement="top" className="header-search-position">
        <Modal.Dialog
          aria-label={t('header.search')}
          className="m-0 flex max-h-full min-h-0 max-w-none flex-col gap-3 rounded-none bg-transparent p-0 shadow-none"
        >
          <form
            role="search"
            className="flex h-11 shrink-0 items-center gap-3 rounded-xl border border-border bg-overlay pl-4 pr-1 focus-within:border-accent/60"
            onSubmit={(event) => {
              event.preventDefault()
              openResults(value)
            }}
          >
            <SearchIcon className="shrink-0 text-muted" />
            <input
              ref={input_ref}
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={t('header.search_placeholder')}
              aria-label={t('header.search')}
              aria-controls="header-search-results"
              maxLength={100}
              autoComplete="off"
              enterKeyHint="search"
              className="h-full min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted focus-visible:outline-none"
            />
            <Button
              variant="ghost"
              isIconOnly
              aria-label={value ? t('header.search_clear_query') : t('common.close')}
              onPress={value ? handleClear : closeSearch}
              className="size-9 min-w-9 text-muted"
            >
              <BaseIcon name="close" />
            </Button>
          </form>
          <div
            id="header-search-results"
            className="min-h-0 overflow-y-auto overscroll-contain rounded-xl border border-border bg-overlay p-3 shadow-xl"
          >
            {q.length === 0 ? (
              <>
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <h2 className="text-sm font-medium">{t('header.search_recent')}</h2>
                  {recent_searches.length > 0 ? (
                    <Button variant="ghost" size="sm" onPress={clearRecentSearches}>
                      {t('header.search_clear')}
                    </Button>
                  ) : null}
                </div>
                {recent_searches.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-muted">{t('header.search_recent_empty')}</p>
                ) : null}
                <ul>
                  {recent_searches.map((item) => (
                    <li key={item}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-surface-secondary"
                        onClick={() => openResults(item)}
                      >
                        <SearchIcon className="shrink-0 text-muted" />
                        <span className="truncate">{item}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : q.length < 2 ? (
              <p role="status" className="px-3 py-4 text-sm text-muted">
                {t('header.search_min_length')}
              </p>
            ) : search.is_searching ? (
              <div
                role="status"
                aria-label={t('common.loading')}
                className="flex justify-center py-2"
              >
                <Spinner size="md" />
              </div>
            ) : search.isError ? (
              <ErrorState
                title={t('search.error')}
                onRetry={() => void search.refetch()}
                className="py-5"
              />
            ) : search.data ? (
              <HeaderSearchResults
                results={search.data}
                onSelect={handleSelect}
                onShowAll={() => openResults(value)}
              />
            ) : null}
          </div>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
