import type { ModerationFilters as Filters } from '@blog/contracts'
import { useTopics } from '@/entities/topic'
import { useT } from '@/shared/i18n'
import { FormTextField, Select } from '@/shared/ui'
export function ModerationFilters({
  value,
  onChange,
  article_filters,
  report_filters,
}: {
  value: Filters
  onChange: (key: string, value: string) => void
  article_filters: boolean
  report_filters: boolean
}) {
  const { t } = useT()
  const topics = useTopics()
  return (
    <div className="moderation-filters grid min-w-0 grid-cols-1 items-start gap-4 p-1 sm:grid-cols-2 lg:grid-cols-3">
      <FormTextField
        label={t('admin.filters.search')}
        size="base"
        variant="secondary"
        type="search"
        value={value.q}
        onChange={(event) => onChange('q', event.target.value)}
      />
      {report_filters ? (
        <Select
          label={t('admin.table.status')}
          size="base"
          variant="secondary"
          value={value.status}
          options={(['open', 'reviewed', 'all'] as const).map((value) => ({
            value,
            label: t(`admin.filters.${value}`),
          }))}
          onChange={(value) => onChange('status', value)}
        />
      ) : null}
      <Select
        label={t('admin.filters.sort')}
        size="base"
        variant="secondary"
        value={value.sort}
        options={(['newest', 'oldest'] as const).map((value) => ({
          value,
          label: t(`admin.filters.${value}`),
        }))}
        onChange={(value) => onChange('sort', value)}
      />
      {(['from', 'to'] as const).map((field) => (
        <FormTextField
          key={field}
          label={t(`admin.filters.${field}`)}
          size="base"
          variant="secondary"
          type="date"
          value={value[field] ?? ''}
          max={field === 'from' ? value.to : undefined}
          min={field === 'to' ? value.from : undefined}
          onChange={(event) => onChange(field, event.target.value)}
        />
      ))}
      {article_filters ? (
        <>
          <Select
            label={t('admin.filters.topic')}
            size="base"
            variant="secondary"
            value={value.topic_id ?? 'all'}
            options={[
              { value: 'all', label: t('admin.filters.all') },
              ...(topics.data ?? []).map((topic) => ({ value: topic.id, label: topic.title })),
            ]}
            onChange={(value) => onChange('topic_id', value === 'all' ? '' : value)}
          />
          <Select
            label={t('admin.filters.publication')}
            size="base"
            variant="secondary"
            value={value.article_status}
            options={(['all', 'published', 'hidden'] as const).map((value) => ({
              value,
              label: t(`admin.filters.${value}`),
            }))}
            onChange={(value) => onChange('article_status', value)}
          />
        </>
      ) : null}
    </div>
  )
}
