import { Link } from 'react-router'
import type { SearchResult } from '@/entities/search'
import { useT } from '@/shared/i18n'
import { Avatar, SearchIcon } from '@/shared/ui'

const PREVIEW_LIMIT = 3
const RESULT_CLASS =
  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-foreground outline-offset-2 hover:bg-surface-secondary focus-visible:bg-surface-secondary'

type HeaderSearchResultsProps = {
  results: SearchResult
  onSelect: () => void
  onShowAll: () => void
}

export function HeaderSearchResults({ results, onSelect, onShowAll }: HeaderSearchResultsProps) {
  const { t } = useT()
  const is_empty = !results.people.length && !results.topics.length && !results.articles.length

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        className="flex items-center gap-3 rounded-lg bg-surface-secondary px-3 py-2.5 text-left text-sm hover:bg-surface-tertiary"
        onClick={onShowAll}
      >
        <span aria-hidden="true" className="text-xl leading-none text-muted">
          ↵
        </span>
        {t('header.search_all_results')}
      </button>
      {is_empty ? (
        <p role="status" className="px-3 py-6 text-center text-sm text-muted">
          {t('search.empty')}
        </p>
      ) : null}
      {results.people.length > 0 ? (
        <section aria-labelledby="header-search-people">
          <h2 id="header-search-people" className="px-3 pb-2 pt-1 font-medium">
            {t('search.people')}
          </h2>
          <ul>
            {results.people.slice(0, PREVIEW_LIMIT).map((person) => (
              <li key={person.user_id}>
                <Link to={person.href} onClick={onSelect} className={RESULT_CLASS}>
                  <Avatar src={person.avatar_url} name={person.display_name} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{person.display_name}</p>
                    <p className="truncate text-xs text-muted">{person.slug}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {results.topics.length > 0 ? (
        <section aria-labelledby="header-search-topics">
          <h2 id="header-search-topics" className="px-3 pb-2 pt-1 font-medium">
            {t('search.topics')}
          </h2>
          <ul>
            {results.topics.slice(0, PREVIEW_LIMIT).map((topic) => (
              <li key={topic.id}>
                <Link
                  to={`/t/${encodeURIComponent(topic.slug)}`}
                  onClick={onSelect}
                  className={RESULT_CLASS}
                >
                  <Avatar src={topic.avatar_url} name={topic.title} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{topic.title}</p>
                    <p className="truncate text-xs text-muted">{topic.slug}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {results.articles.length > 0 ? (
        <section aria-labelledby="header-search-articles">
          <h2 id="header-search-articles" className="px-3 pb-2 pt-1 font-medium">
            {t('search.articles')}
          </h2>
          <ul>
            {results.articles.slice(0, PREVIEW_LIMIT).map((article) => (
              <li key={article.id}>
                <Link to={article.href} onClick={onSelect} className={RESULT_CLASS}>
                  <SearchIcon className="shrink-0 text-muted" />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-medium">{article.title}</p>
                    <p className="truncate text-xs text-muted">
                      {article.author.display_name} · {article.topic.title}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
