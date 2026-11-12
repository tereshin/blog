import { useInfiniteQuery } from '@tanstack/react-query'
import { adminPagesSchema } from '@blog/contracts'
import { http } from '@/shared/api'
import type { AdminWidget } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { moveItem } from '../model/default-widget.ts'
import { WidgetField, WIDGET_INPUT_CLASS } from './WidgetField.tsx'
type Data = Extract<AdminWidget, { type: 'adminButtons' }>['data']
export function ButtonsSettings({
  data,
  onChange,
}: {
  data: Data
  onChange: (data: Data) => void
}) {
  const { t } = useT()
  const pages = useInfiniteQuery({
    queryKey: ['widget-target-pages'],
    queryFn: ({ signal, pageParam }) =>
      http.get('/v1/admin/pages', adminPagesSchema, {
        signal,
        query: { status: 'published', cursor: pageParam, limit: 100 },
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.next_cursor,
    enabled: data.items.some((item) => item.target.kind === 'page'),
  })
  const targets = pages.data?.pages.flatMap((page) => page.items) ?? []
  const update = (id: string, patch: Partial<Data['items'][number]>) =>
    onChange({
      ...data,
      items: data.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })
  return (
    <div className="grid gap-3">
      <WidgetField label={t('widgets.title')}>
        <input
          className={WIDGET_INPUT_CLASS}
          value={data.title}
          onChange={(event) => onChange({ ...data, title: event.target.value })}
        />
      </WidgetField>
      <label className="text-sm">
        <input
          type="checkbox"
          checked={data.is_expanded}
          onChange={(event) => onChange({ ...data, is_expanded: event.target.checked })}
        />{' '}
        {t('widgets.expanded')}
      </label>
      {data.items.map((item, index) => (
        <fieldset key={item.id} className="grid gap-2 rounded-lg border border-separator p-2">
          <WidgetField label={t('widgets.label')}>
            <input
              className={WIDGET_INPUT_CLASS}
              value={item.title}
              onChange={(event) => update(item.id, { title: event.target.value })}
            />
          </WidgetField>
          <WidgetField label={t('widgets.target')}>
            <select
              className={WIDGET_INPUT_CLASS}
              value={item.target.kind}
              onChange={(event) =>
                update(item.id, {
                  target:
                    event.target.value === 'page'
                      ? { kind: 'page', page_id: '' }
                      : { kind: 'url', url: '' },
                })
              }
            >
              <option value="url">{t('widgets.url')}</option>
              <option value="page">{t('widgets.page')}</option>
            </select>
          </WidgetField>
          {item.target.kind === 'page' ? (
            <WidgetField label={t('widgets.page')}>
              <select
                className={WIDGET_INPUT_CLASS}
                value={item.target.page_id}
                onChange={(event) =>
                  update(item.id, { target: { kind: 'page', page_id: event.target.value } })
                }
              >
                <option value="">{t('widgets.choose_page')}</option>
                {item.target.page_id &&
                !targets.some(
                  (page) => page.id === (item.target.kind === 'page' ? item.target.page_id : ''),
                ) ? (
                  <option value={item.target.page_id}>{item.target.page_id}</option>
                ) : null}
                {targets.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.title}
                  </option>
                ))}
              </select>
              {pages.hasNextPage ? (
                <button type="button" onClick={() => void pages.fetchNextPage()}>
                  {t('widgets.more_pages')}
                </button>
              ) : null}
            </WidgetField>
          ) : (
            <WidgetField label={t('widgets.url')}>
              <input
                className={WIDGET_INPUT_CLASS}
                type="url"
                value={item.target.url}
                onChange={(event) =>
                  update(item.id, { target: { kind: 'url', url: event.target.value } })
                }
              />
            </WidgetField>
          )}
          <WidgetField label={t('widgets.icon')}>
            <textarea
              className={WIDGET_INPUT_CLASS}
              value={item.icon ?? ''}
              onChange={(event) => update(item.id, { icon: event.target.value || null })}
            />
          </WidgetField>
          <div className="flex gap-4 text-sm">
            <button
              type="button"
              disabled={index === 0}
              aria-label={t('widgets.up')}
              onClick={() => onChange({ ...data, items: moveItem(data.items, index, -1) })}
            >
              ↑
            </button>
            <button
              type="button"
              disabled={index === data.items.length - 1}
              aria-label={t('widgets.down')}
              onClick={() => onChange({ ...data, items: moveItem(data.items, index, 1) })}
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() =>
                onChange({ ...data, items: data.items.filter((other) => other.id !== item.id) })
              }
            >
              {t('widgets.remove')}
            </button>
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        className="text-left text-sm"
        disabled={data.items.length >= 30}
        onClick={() =>
          onChange({
            ...data,
            items: [
              ...data.items,
              { id: crypto.randomUUID(), title: '', icon: null, target: { kind: 'url', url: '' } },
            ],
          })
        }
      >
        {t('widgets.add_button')}
      </button>
    </div>
  )
}
