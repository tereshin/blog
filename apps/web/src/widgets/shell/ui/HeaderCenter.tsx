import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useT } from '@/shared/i18n'
import { ArrowLeftIcon, SearchIcon } from '@/shared/ui'
import { getReturnTarget } from '../lib/feed-return.ts'
import { useShellStore } from '../model/useShellStore.ts'

/** «Назад» ведёт в сохранённую ленту или в «Свежее», если статью открыли прямой ссылкой. */
function HeaderBack({ title }: { title: string }) {
  const { t } = useT()
  const target = getReturnTarget()
  return (
    <div className="flex min-w-0 w-full max-w-xl items-center gap-1">
      <Link
        to={target.path}
        aria-label={t('header.back')}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-foreground outline-offset-2 hover:bg-surface-secondary"
      >
        <ArrowLeftIcon width={18} height={18} />
      </Link>
      <span title={title} className="min-w-0 truncate text-sm font-medium">
        {title}
      </span>
    </div>
  )
}

/** Поле поиска: Enter открывает `/search`, панель показывает последние запросы этой вкладки. */
function HeaderSearch() {
  const { t } = useT()
  const navigate = useNavigate()
  const closeSearch = useShellStore((state) => state.closeSearch)
  const recent_searches = useShellStore((state) => state.recent_searches)
  const rememberSearch = useShellStore((state) => state.rememberSearch)
  const clearRecentSearches = useShellStore((state) => state.clearRecentSearches)
  const root_ref = useRef<HTMLDivElement>(null)
  const input_ref = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')

  useEffect(() => {
    input_ref.current?.focus()
  }, [])

  useEffect(() => {
    const on_pointer = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node) || root_ref.current?.contains(target)) return
      closeSearch()
    }
    document.addEventListener('mousedown', on_pointer)
    return () => document.removeEventListener('mousedown', on_pointer)
  }, [closeSearch])

  const open_results = (query: string) => {
    const q = query.trim()
    if (q.length < 2) return
    rememberSearch(q)
    navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  const shown = recent_searches.filter((item) => item.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase()))

  return (
    <div ref={root_ref} className="relative mx-auto min-w-0 w-full max-w-xl flex-1">
      <form
        className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-1.5"
        onSubmit={(event) => {
          event.preventDefault()
          open_results(value)
        }}
      >
        <SearchIcon width={16} height={16} className="shrink-0 text-muted" />
        <input
          ref={input_ref}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') closeSearch()
          }}
          placeholder={t('header.search')}
          aria-label={t('header.search')}
          aria-expanded="true"
          aria-controls="header-search-recent"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
        />
      </form>
      <div
        id="header-search-recent"
        className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 rounded-xl border border-border bg-overlay p-2 shadow-lg"
      >
        <div className="flex items-center justify-between gap-3 px-2 py-1.5">
          <p className="text-sm text-foreground">{t('header.search_recent')}</p>
          {recent_searches.length > 0 ? (
            <button type="button" className="text-sm text-accent" onClick={clearRecentSearches}>
              {t('header.search_clear')}
            </button>
          ) : null}
        </div>
        {shown.length === 0 ? <p className="px-2 py-2 text-sm text-muted">{t('header.search_recent_empty')}</p> : null}
        <ul>
          {shown.map((item) => (
            <li key={item}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-foreground hover:bg-surface-secondary"
                onClick={() => open_results(item)}
              >
                <SearchIcon width={16} height={16} className="shrink-0 text-muted" />
                <span className="truncate">{item}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Центр шапки по режиму из стора. Пустой режим ничего не рисует. */
export function HeaderCenter() {
  const header_center = useShellStore((state) => state.header_center)
  switch (header_center.kind) {
    case 'empty':
      return null
    case 'search':
      return <HeaderSearch />
    case 'back':
      return <HeaderBack title={header_center.title} />
  }
}
