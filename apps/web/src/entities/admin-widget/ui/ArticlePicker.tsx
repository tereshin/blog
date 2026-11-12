import { useDeferredValue, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchResponseSchema, articleCardsSchema } from '@blog/contracts'
import { http } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { ComboBox } from '@/shared/ui'
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
  const selected = useQuery({
    queryKey: ['widget-selected-article', value],
    queryFn: ({ signal }) =>
      http.get('/v1/articles', articleCardsSchema, { query: { ids: value }, signal }),
    enabled: Boolean(value),
  })
  const options = [
    { value: 'all', label: t('widgets.all_articles') },
    ...(query.data?.articles ?? []).map((article) => ({ value: article.id, label: article.title })),
  ]
  if (value && !options.some((option) => option.value === value))
    options.push({ value, label: selected.data?.items[0]?.title ?? value })
  return (
    <ComboBox
      label={t('widgets.article')}
      value={value ?? 'all'}
      options={options}
      onSearch={setSearch}
      onChange={(value) => onChange(value === 'all' ? null : value)}
      error={query.isError ? t('error.unknown') : undefined}
    />
  )
}
