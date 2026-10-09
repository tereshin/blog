import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useFirstArticle } from '@/entities/article'
import { useT } from '@/shared/i18n'
import { ArrowLeftIcon } from '@/shared/ui'
import { getReturnTarget } from '../lib/feed-return.ts'
import { useShellStore } from '../model/useShellStore.ts'

/**
 * Пилюля в центре шапки: название первой карточки «Популярного», вторичного вида, в одну строку.
 * Пока данных нет — скрыта. Это ссылка, а не поле ввода.
 */
function HeaderPill() {
  const article = useFirstArticle('popular')
  if (!article) return null
  return (
    <Link
      to={article.href}
      title={article.title}
      className="block min-w-0 max-w-full truncate rounded-pill bg-surface-secondary px-4 py-1.5 text-sm text-muted outline-offset-2 hover:text-foreground"
    >
      {article.title}
    </Link>
  )
}

/** «Назад» ведёт в сохранённую ленту или в «Свежее», если статью открыли прямой ссылкой. */
function HeaderBack({ title }: { title: string }) {
  const { t } = useT()
  const target = getReturnTarget()
  return (
    <div className="flex min-w-0 max-w-xl items-center gap-1">
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

/** Поле вместо пилюли: Enter открывает `/search`, Escape и закрытие возвращают прежний центр. */
function HeaderSearch() {
  const { t } = useT()
  const navigate = useNavigate()
  const closeSearch = useShellStore((state) => state.closeSearch)
  const input_ref = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')

  useEffect(() => {
    input_ref.current?.focus()
  }, [])

  return (
    <form
      className="flex min-w-0 max-w-xl flex-1 items-center gap-1"
      onSubmit={(event) => {
        event.preventDefault()
        const q = value.trim()
        if (q.length < 2) return
        navigate(`/search?q=${encodeURIComponent(q)}`)
      }}
    >
      <input
        ref={input_ref}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') closeSearch()
        }}
        aria-label={t('header.search')}
        className="min-w-0 flex-1 rounded-pill bg-surface-secondary px-4 py-1.5 text-sm text-foreground outline-offset-2"
      />
      <button type="button" aria-label={t('common.close')} className="shrink-0 rounded-md px-2 py-1 text-sm text-muted" onClick={closeSearch}>
        {t('common.close')}
      </button>
    </form>
  )
}

/** Центр шапки по режиму из стора. */
export function HeaderCenter() {
  const header_center = useShellStore((state) => state.header_center)
  switch (header_center.kind) {
    case 'pill':
      return <HeaderPill />
    case 'search':
      return <HeaderSearch />
    case 'back':
      return <HeaderBack title={header_center.title} />
  }
}
