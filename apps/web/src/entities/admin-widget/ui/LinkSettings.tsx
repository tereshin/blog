import { useInfiniteQuery } from '@tanstack/react-query'
import { adminPagesSchema, type SidebarLink } from '@blog/contracts'
import { http } from '@/shared/api'
import { useT } from '@/shared/i18n'
import { Button, ComboBox, FormTextField, Select, SvgIconField } from '@/shared/ui'

export function LinkSettings({
  value,
  onChange,
  errors = {},
}: {
  value: SidebarLink
  onChange: (value: SidebarLink) => void
  errors?: Record<string, string>
}) {
  const { t } = useT()
  const pages = useInfiniteQuery({
    queryKey: ['sidebar-target-pages'],
    queryFn: ({ signal, pageParam }) =>
      http.get('/v1/admin/pages', adminPagesSchema, {
        signal,
        query: { cursor: pageParam, limit: 100 },
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next_cursor,
    enabled: value.target.kind === 'page',
  })
  const options =
    pages.data?.pages.flatMap((page) =>
      page.items.map((item) => ({ value: item.id, label: item.title })),
    ) ?? []
  const page_id = value.target.kind === 'page' ? value.target.page_id : null
  if (page_id && !options.some((option) => option.value === page_id))
    options.push({ value: page_id, label: page_id })
  return (
    <div className="grid gap-4">
      <FormTextField
        label={t('widgets.label')}
        value={value.title}
        error={errors.title}
        maxLength={80}
        onChange={(event) => onChange({ ...value, title: event.target.value })}
      />
      <SvgIconField value={value.icon} onChange={(icon) => onChange({ ...value, icon })} />
      <Select
        label={t('widgets.target')}
        value={value.target.kind}
        options={[
          { value: 'page', label: t('widgets.page') },
          { value: 'url', label: t('widgets.url') },
        ]}
        onChange={(kind) =>
          onChange({
            ...value,
            target: kind === 'page' ? { kind, page_id: null } : { kind: 'url', url: '' },
          })
        }
      />
      {value.target.kind === 'page' ? (
        <>
          <ComboBox
            label={t('widgets.page')}
            value={page_id ?? ''}
            options={options}
            error={errors.target}
            onChange={(page_id) => onChange({ ...value, target: { kind: 'page', page_id } })}
          />
          {pages.hasNextPage ? (
            <Button type="button" variant="ghost" onPress={() => void pages.fetchNextPage()}>
              {t('widgets.more_pages')}
            </Button>
          ) : null}
          {pages.isError ? <p role="alert">{t('error.unknown')}</p> : null}
        </>
      ) : (
        <FormTextField
          label={t('widgets.url')}
          value={value.target.url}
          error={errors.target}
          onChange={(event) =>
            onChange({ ...value, target: { kind: 'url', url: event.target.value } })
          }
        />
      )}
    </div>
  )
}
