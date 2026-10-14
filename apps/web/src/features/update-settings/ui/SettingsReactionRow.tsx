import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Radio } from '@heroui/react/radio'
import { RadioGroup } from '@heroui/react/radio-group'
import { Label } from '@heroui/react/label'
import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { BaseIcon, Button, FormTextField } from '@/shared/ui'
import type { AppearanceDraft, AppearanceFieldError } from '../model/appearance-draft.ts'

type SettingsReactionRowProps = {
  item: AppearanceDraft
  can_edit: boolean
  can_retire: boolean
  error?: AppearanceFieldError
  upload: (options: { label: string; onUploaded: (url: string) => void }) => ReactNode
  onPatch: (
    kind: string,
    patch: Partial<Pick<AppearanceDraft, 'presentation' | 'emoji' | 'image_url' | 'label'>>,
  ) => void
  onRetire: (kind: string) => void
}

export function SettingsReactionRow({
  item,
  can_edit,
  can_retire,
  error,
  upload,
  onPatch,
  onRetire,
}: SettingsReactionRowProps) {
  const { t } = useT()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.kind,
    disabled: !can_edit,
  })
  const name = item.label || t('admin.settings.reaction_name')
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex gap-3 border-b border-separator pb-6 last:border-0 last:pb-0 ${isDragging ? 'z-10 bg-background opacity-80' : ''}`}
    >
      <button
        type="button"
        className="mt-9 inline-flex size-10 shrink-0 items-center justify-center rounded-md text-muted disabled:opacity-40"
        aria-label={t('admin.settings.reaction_drag', { name })}
        disabled={!can_edit}
        {...attributes}
        {...listeners}
      >
        <BaseIcon name="menu" style="line" size={18} />
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <FormTextField
          label={t('admin.settings.reaction_name')}
          aria-label={`${name}, ${t('admin.settings.reaction_name')}`}
          error={error === 'label' ? t('admin.settings.reaction_name_required') : undefined}
          value={item.label}
          maxLength={50}
          disabled={!can_edit}
          aria-invalid={error === 'label'}
          onChange={(event) => onPatch(item.kind, { label: event.target.value })}
        />
        <RadioGroup
          aria-label={name}
          value={item.presentation}
          isDisabled={!can_edit}
          onChange={(presentation) =>
            onPatch(item.kind, { presentation: presentation === 'image' ? 'image' : 'emoji' })
          }
          orientation="horizontal"
        >
          {(['emoji', 'image'] as const).map((presentation) => (
            <Radio key={presentation} value={presentation}>
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                <Label>{t(`admin.settings.appearance.${presentation}`)}</Label>
              </Radio.Content>
            </Radio>
          ))}
        </RadioGroup>
        {item.presentation === 'emoji' ? (
          <FormTextField
            label={t('admin.settings.appearance.emoji')}
            aria-label={`${name}, ${t('admin.settings.appearance.emoji')}`}
            error={error === 'emoji' ? t('admin.settings.appearance.emoji_invalid') : undefined}
            value={item.emoji}
            disabled={!can_edit}
            aria-invalid={error === 'emoji'}
            onChange={(event) => onPatch(item.kind, { emoji: event.target.value })}
          />
        ) : can_edit ? (
          upload({
            label: name,
            onUploaded: (url) => onPatch(item.kind, { image_url: url, presentation: 'image' }),
          })
        ) : (
          <Button type="button" isDisabled>
            {name}
          </Button>
        )}
        {item.presentation === 'image' && item.image_url ? (
          <img loading="lazy" src={item.image_url} alt="" className="h-8 w-8 object-contain" />
        ) : null}
        {error === 'image' ? (
          <p className="text-sm text-danger">{t('admin.settings.appearance.image_missing')}</p>
        ) : null}
        {can_edit ? (
          <Button
            type="button"
            variant="ghost"
            className="self-start"
            isDisabled={!can_retire}
            onPress={() => onRetire(item.kind)}
          >
            {t('admin.settings.reaction_retire')}
          </Button>
        ) : null}
      </div>
    </li>
  )
}
