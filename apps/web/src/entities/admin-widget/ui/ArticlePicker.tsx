import { useDeferredValue, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchResponseSchema } from '@blog/contracts'
import { http } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { WidgetField, WIDGET_INPUT_CLASS } from './WidgetField.tsx'

export function ArticlePicker({
  value,
  onChange,
}: {
  value: string | null
  onChange: (value: string | null) => void
}) {
  const { t } = useT()
  const [search, setSearch] = useState('')
  const q = useDeferredValue(search.trim())
  const query = useQuery({
    queryKey: ['widget-article-search', q],
    queryFn: ({ signal }) => http.get('/v1/search', searchResponseSchema, { query: { q }, signal }),
    enabled: q.length >= 2,
  })
  const articles = query.data?.articles ?? []
  return (
    <div className="grid gap-2">
      <WidgetField label={t('widgets.search_articles')}>
        <input
          className={WIDGET_INPUT_CLASS}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </WidgetField>
      <WidgetField label={t('widgets.article')}>
        <select
          className={WIDGET_INPUT_CLASS}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value || null)}
        >
          <option value="">{t('widgets.all_articles')}</option>
          {value && !articles.some((article) => article.id === value) ? (
            <option value={value}>{value}</option>
          ) : null}
          {articles.map((article) => (
            <option key={article.id} value={article.id}>
              {article.title}
            </option>
          ))}
        </select>
      </WidgetField>
    </div>
  )
}
