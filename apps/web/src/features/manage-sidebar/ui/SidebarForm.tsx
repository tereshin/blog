import { moveItem } from '@/entities/admin-widget'
import { Button, Card, ErrorState } from '@/shared/ui'
import { useT } from '@/shared/i18n'
import { useSidebarForm } from '../model/useSidebarForm.ts'
import { SidebarSectionForm } from './SidebarSectionForm.tsx'
export function SidebarForm() {
  const { t } = useT()
  const form = useSidebarForm()
  if (form.query.isPending) return <p>{t('common.loading')}</p>
  if (form.query.isError || !form.config)
    return <ErrorState title={t('error.unknown')} onRetry={() => void form.query.refetch()} />
  const config = form.config
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        form.save()
      }}
      className="grid gap-4"
    >
      <fieldset disabled={form.mutation.isPending} className="grid min-w-0 gap-4">
        {config.sections.map((section, index) => (
          <Card key={section.id}>
            <Card.Content className="grid gap-4">
              <SidebarSectionForm
                section={section}
                onChange={(updated) =>
                  form.change({
                    ...config,
                    sections: config.sections.map((item) =>
                      item.id === updated.id ? updated : item,
                    ),
                  })
                }
              />
              <div className="flex gap-4 text-sm">
                <button
                  type="button"
                  disabled={index === 0}
                  aria-label={t('widgets.up')}
                  onClick={() =>
                    form.change({ ...config, sections: moveItem(config.sections, index, -1) })
                  }
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === config.sections.length - 1}
                  aria-label={t('widgets.down')}
                  onClick={() =>
                    form.change({ ...config, sections: moveItem(config.sections, index, 1) })
                  }
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() =>
                    form.change({
                      ...config,
                      sections: config.sections.filter((item) => item.id !== section.id),
                    })
                  }
                >
                  {t('widgets.remove')}
                </button>
              </div>
            </Card.Content>
          </Card>
        ))}
        <Button
          type="button"
          isDisabled={config.sections.length >= 20}
          onPress={() =>
            form.change({
              ...config,
              sections: [
                ...config.sections,
                { id: crypto.randomUUID(), title: '', has_card: true, widgets: [] },
              ],
            })
          }
        >
          {t('widgets.add_section')}
        </Button>
        <Button type="submit">{t('widgets.save')}</Button>
      </fieldset>
      {form.is_invalid ? (
        <p role="alert" className="text-danger">
          {t('widgets.invalid')}
        </p>
      ) : null}
      {form.mutation.isSuccess ? <p role="status">{t('widgets.saved')}</p> : null}
      {form.mutation.isError ? (
        <div role="alert">
          <p className="text-danger">
            {t(form.is_conflict ? 'widgets.conflict' : 'error.unknown')}
          </p>
          {form.is_conflict ? (
            <Button type="button" onPress={() => void form.reload()}>
              {t('widgets.reload')}
            </Button>
          ) : null}
        </div>
      ) : null}
    </form>
  )
}
