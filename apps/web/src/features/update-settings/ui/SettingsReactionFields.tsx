import { Radio } from '@heroui/react/radio'
import { RadioGroup } from '@heroui/react/radio-group'
import { Label } from '@heroui/react/label'
import { Input } from '@/shared/ui'
import type { ReactNode } from 'react'
import { REACTION_LABEL } from '@/entities/reaction'
import type { ReactionKind } from '@/entities/reaction'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'
import type { AppearanceDraft } from '../model/appearance-draft.ts'

type SettingsReactionFieldsProps = {
  drafts: readonly AppearanceDraft[]
  can_edit_media: boolean
  errors: Partial<Record<ReactionKind, 'emoji' | 'image'>>
  upload: (options: { label: string; onUploaded: (url: string) => void }) => ReactNode
  onPatch: (
    kind: ReactionKind,
    patch: Partial<Pick<AppearanceDraft, 'presentation' | 'emoji' | 'image_url'>>,
  ) => void
}

export function SettingsReactionFields({
  drafts,
  can_edit_media,
  errors,
  upload,
  onPatch,
}: SettingsReactionFieldsProps) {
  const { t } = useT()
  return (
    <fieldset className="flex flex-col gap-3 border-0 p-0">
      <legend className="text-sm font-medium">{t('admin.settings.reactions')}</legend>
      {drafts.map((item) => {
        const label = t(REACTION_LABEL[item.kind])
        const error = errors[item.kind]
        return (
          <div key={item.kind} className="flex flex-col gap-2">
            <span className="text-sm">{label}</span>
            <RadioGroup
              aria-label={label}
              value={item.presentation}
              isDisabled={!can_edit_media}
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
              <Input
                value={item.emoji}
                disabled={!can_edit_media}
                aria-label={label}
                aria-invalid={error === 'emoji'}
                onChange={(event) => onPatch(item.kind, { emoji: event.target.value })}
              />
            ) : can_edit_media ? (
              upload({
                label,
                onUploaded: (url) => onPatch(item.kind, { image_url: url, presentation: 'image' }),
              })
            ) : (
              <Button type="button" isDisabled>
                {label}
              </Button>
            )}
            {item.presentation === 'image' && item.image_url ? (
              <img src={item.image_url} alt="" className="h-8 w-8 object-contain" />
            ) : null}
            {error === 'emoji' ? (
              <p className="text-sm text-danger">{t('admin.settings.appearance.emoji_invalid')}</p>
            ) : null}
            {error === 'image' ? (
              <p className="text-sm text-danger">{t('admin.settings.appearance.image_missing')}</p>
            ) : null}
          </div>
        )
      })}
    </fieldset>
  )
}
