import { useState } from 'react'
import type { LeftSidebar, SidebarLink } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { Button, ErrorState } from '@/shared/ui'
import type { ConfigDraft } from '../model/useConfigDraft.ts'
import { reorder } from '../model/reorder.ts'
import { ConfigList, EditorSection } from './ConfigList.tsx'
import { LinkDialog } from './LinkDialog.tsx'
import { SectionDialog } from './SectionDialog.tsx'
import { DraftStatus } from './DraftStatus.tsx'
type Section = LeftSidebar['sections'][number]
export function LeftSidebarPanel({ form }: { form: ConfigDraft<LeftSidebar> }) {
  const { t } = useT()
  const [section, setSection] = useState<Section | null>(null)
  const [link, setLink] = useState<{ section_id: string; value: SidebarLink } | null>(null)
  if (!form.config)
    return form.query.isError ? (
      <ErrorState title={t('error.unknown')} onRetry={() => void form.query.refetch()} />
    ) : (
      <p>{t('common.loading')}</p>
    )
  const config = form.config
  const changeSections = (sections: Section[]) => form.change({ ...config, sections })
  const changeItems = (section_id: string, items: SidebarLink[]) =>
    changeSections(
      config.sections.map((section) =>
        section.id === section_id ? { ...section, items } : section,
      ),
    )
  return (
    <div className="grid gap-4">
      <fieldset disabled={form.mutation.isPending} className="grid min-w-0 gap-4">
        <ConfigList
          entries={config.sections}
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
                title={current.title}
                count={current.items.length}
                actions={actions}
              >
                <ConfigList
                  entries={current.items.map((item) => ({
                    ...item,
                    description: item.target.kind === 'url' ? item.target.url : t('widgets.page'),
                  }))}
                  onMove={(from, to) => changeItems(id, reorder(current.items, from, to))}
                  onEdit={(item_id) => {
                    const value = current.items.find((item) => item.id === item_id)
                    if (value) setLink({ section_id: id, value })
                  }}
                  onDelete={(item_id) =>
                    changeItems(
                      id,
                      current.items.filter((item) => item.id !== item_id),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="secondary"
                  isDisabled={current.items.length >= 30}
                  onPress={() =>
                    setLink({
                      section_id: id,
                      value: {
                        id: crypto.randomUUID(),
                        title: '',
                        icon: null,
                        target: { kind: 'url', url: '' },
                      },
                    })
                  }
                >
                  {t('sidebars.add_item')}
                </Button>
              </EditorSection>
            )
          }}
        </ConfigList>
        <Button
          type="button"
          variant="secondary"
          isDisabled={config.sections.length >= 20}
          onPress={() => setSection({ id: crypto.randomUUID(), title: '', items: [] })}
        >
          {t('widgets.add_section')}
        </Button>
      </fieldset>
      <DraftStatus form={form} />
      {section ? (
        <SectionDialog
          key={section.id}
          side="left"
          initial={section}
          onClose={() => setSection(null)}
          onSave={(value) => {
            const updated = { ...section, title: value.title.trim() }
            changeSections(
              config.sections.some((section) => section.id === updated.id)
                ? config.sections.map((section) => (section.id === updated.id ? updated : section))
                : [...config.sections, updated],
            )
            setSection(null)
          }}
        />
      ) : null}
      {link ? (
        <LinkDialog
          key={link.value.id}
          initial={link.value}
          onClose={() => setLink(null)}
          onSave={(value) => {
            const items =
              config.sections.find((section) => section.id === link.section_id)?.items ?? []
            changeItems(
              link.section_id,
              items.some((item) => item.id === value.id)
                ? items.map((item) => (item.id === value.id ? value : item))
                : [...items, value],
            )
            setLink(null)
          }}
        />
      ) : null}
    </div>
  )
}
