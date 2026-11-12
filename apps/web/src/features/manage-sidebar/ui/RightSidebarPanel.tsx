import { useState } from 'react'
import type { Sidebar, AdminWidget } from '@blog/contracts'
import { defaultWidget } from '@/entities/admin-widget'
import { useT } from '@/shared/i18n'
import { Button, ErrorState, Menu } from '@/shared/ui'
import type { ConfigDraft } from '../model/useConfigDraft.ts'
import { reorder } from '../model/reorder.ts'
import { ConfigList, EditorSection } from './ConfigList.tsx'
import { SectionDialog } from './SectionDialog.tsx'
import { WidgetDialog } from './WidgetDialog.tsx'
import { DraftStatus } from './DraftStatus.tsx'
type Section = Sidebar['sections'][number]
export function RightSidebarPanel({ form }: { form: ConfigDraft<Sidebar> }) {
  const { t } = useT()
  const [section, setSection] = useState<Section | null>(null)
  const [widget, setWidget] = useState<{ section_id: string; value: AdminWidget } | null>(null)
  if (!form.config)
    return form.query.isError ? (
      <ErrorState title={t('error.unknown')} onRetry={() => void form.query.refetch()} />
    ) : (
      <p>{t('common.loading')}</p>
    )
  const config = form.config
  const changeSections = (sections: Section[]) => form.change({ ...config, sections })
  const changeWidgets = (section_id: string, widgets: AdminWidget[]) =>
    changeSections(
      config.sections.map((section) =>
        section.id === section_id ? { ...section, widgets } : section,
      ),
    )
  function description(widget: AdminWidget) {
    if (widget.type === 'adminComments')
      return `${widget.data.limit} · ${t(`widgets.${widget.data.sort === 'date' ? 'date' : 'reactions'}`)} · ${t(`widgets.${widget.data.period}`)}`
    if (widget.type === 'adminButtons') return widget.data.title
    return widget.data.fields
      .filter((field) => field.is_visible)
      .map((field) => field.label)
      .join(', ')
  }
  return (
    <div className="grid gap-4">
      <fieldset disabled={form.mutation.isPending} className="grid min-w-0 gap-4">
        <ConfigList
          entries={config.sections.map((section) => ({
            ...section,
            title: section.title || t('sidebars.untitled'),
          }))}
          onMove={(from, to) => changeSections(reorder(config.sections, from, to))}
          onEdit={(id) => setSection(config.sections.find((section) => section.id === id) ?? null)}
          onDelete={(id) => changeSections(config.sections.filter((section) => section.id !== id))}
        >
          {(id, actions) => {
            const current = config.sections.find((section) => section.id === id)
            if (!current) return null
            return (
              <EditorSection
                id={id}
                title={current.title || t('sidebars.untitled')}
                count={current.widgets.length}
                actions={actions}
              >
                <ConfigList
                  entries={current.widgets.map((widget) => ({
                    id: widget.id,
                    title: t(`widgets.${widget.type}`),
                    description: description(widget),
                  }))}
                  onMove={(from, to) => changeWidgets(id, reorder(current.widgets, from, to))}
                  onEdit={(widget_id) => {
                    const value = current.widgets.find((widget) => widget.id === widget_id)
                    if (value) setWidget({ section_id: id, value })
                  }}
                  onDelete={(widget_id) =>
                    changeWidgets(
                      id,
                      current.widgets.filter((widget) => widget.id !== widget_id),
                    )
                  }
                />
                <Menu>
                  <Button
                    type="button"
                    variant="secondary"
                    isDisabled={current.widgets.length >= 20}
                  >
                    {t('sidebars.add_item')}
                  </Button>

                  <Menu.Content aria-label={t('sidebars.add_item')}>
                    {(['adminComments', 'adminFeedback', 'adminButtons'] as const).map((type) => (
                      <Menu.Item
                        key={type}
                        id={type}
                        onAction={() => setWidget({ section_id: id, value: defaultWidget(type) })}
                      >
                        {t(`widgets.${type}`)}
                      </Menu.Item>
                    ))}
                  </Menu.Content>
                </Menu>
              </EditorSection>
            )
          }}
        </ConfigList>
        <Button
          type="button"
          variant="secondary"
          isDisabled={config.sections.length >= 20}
          onPress={() =>
            setSection({ id: crypto.randomUUID(), title: '', has_card: true, widgets: [] })
          }
        >
          {t('widgets.add_section')}
        </Button>
      </fieldset>
      <DraftStatus form={form} />
      {section ? (
        <SectionDialog
          key={section.id}
          side="right"
          initial={section}
          onClose={() => setSection(null)}
          onSave={(value) => {
            const updated = {
              ...section,
              title: value.title.trim(),
              has_card: value.has_card ?? true,
            }
            changeSections(
              config.sections.some((section) => section.id === updated.id)
                ? config.sections.map((section) => (section.id === updated.id ? updated : section))
                : [...config.sections, updated],
            )
            setSection(null)
          }}
        />
      ) : null}
      {widget ? (
        <WidgetDialog
          key={widget.value.id}
          initial={widget.value}
          onClose={() => setWidget(null)}
          onSave={(value) => {
            const widgets =
              config.sections.find((section) => section.id === widget.section_id)?.widgets ?? []
            changeWidgets(
              widget.section_id,
              widgets.some((widget) => widget.id === value.id)
                ? widgets.map((widget) => (widget.id === value.id ? value : widget))
                : [...widgets, value],
            )
            setWidget(null)
          }}
        />
      ) : null}
    </div>
  )
}
