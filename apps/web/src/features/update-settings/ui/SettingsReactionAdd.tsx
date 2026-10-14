import { Radio } from '@heroui/react/radio'
import { RadioGroup } from '@heroui/react/radio-group'
import { Label } from '@heroui/react/label'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useT } from '@/shared/i18n'
import { Button, FormTextField } from '@/shared/ui'
import { isSingleEmoji } from '../model/appearance-draft.ts'
import type { AppearanceDraft } from '../model/appearance-draft.ts'

type SettingsReactionAddProps = {
  can_add: boolean
  upload: (options: { label: string; onUploaded: (url: string) => void }) => ReactNode
  onAdd: (draft: AppearanceDraft) => void
}

export function SettingsReactionAdd({ can_add, upload, onAdd }: SettingsReactionAddProps) {
  const { t } = useT()
  const [label, setLabel] = useState('')
  const [presentation, setPresentation] = useState<'emoji' | 'image'>('emoji')
  const [emoji, setEmoji] = useState('')
  const [image_url, setImageUrl] = useState('')
  const [error, setError] = useState<'label' | 'emoji' | 'image' | null>(null)

  const add = () => {
    const name = label.trim()
    if (!name) {
      setError('label')
      return
    }
    if (presentation === 'emoji' && !isSingleEmoji(emoji)) {
      setError('emoji')
      return
    }
    if (presentation === 'image' && image_url.trim().length === 0) {
      setError('image')
      return
    }
    onAdd({
      kind: crypto.randomUUID(),
      label: name,
      status: 'active',
      presentation,
      emoji,
      image_url,
    })
    setLabel('')
    setEmoji('')
    setImageUrl('')
    setPresentation('emoji')
    setError(null)
  }

  return (
    <div className="flex flex-col gap-4 border-t border-separator pt-6">
      <span className="text-base font-semibold">{t('admin.settings.reaction_add')}</span>
      {!can_add ? <p className="text-sm text-muted">{t('admin.settings.reaction_limit')}</p> : null}
      <FormTextField
        label={t('admin.settings.reaction_name')}
        aria-label={t('admin.settings.reaction_add_name')}
        error={error === 'label' ? t('admin.settings.reaction_name_required') : undefined}
        value={label}
        maxLength={50}
        disabled={!can_add}
        aria-invalid={error === 'label'}
        onChange={(event) => {
          setLabel(event.target.value)
          setError((current) => (current === 'label' ? null : current))
        }}
      />
      <RadioGroup
        aria-label={t('admin.settings.reaction_add')}
        value={presentation}
        isDisabled={!can_add}
        onChange={(value) => setPresentation(value === 'image' ? 'image' : 'emoji')}
        orientation="horizontal"
      >
        {(['emoji', 'image'] as const).map((value) => (
          <Radio key={value} value={value}>
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              <Label>{t(`admin.settings.appearance.${value}`)}</Label>
            </Radio.Content>
          </Radio>
        ))}
      </RadioGroup>
      {presentation === 'emoji' ? (
        <FormTextField
          label={t('admin.settings.appearance.emoji')}
          aria-label={t('admin.settings.reaction_add_emoji')}
          error={error === 'emoji' ? t('admin.settings.appearance.emoji_invalid') : undefined}
          value={emoji}
          disabled={!can_add}
          aria-invalid={error === 'emoji'}
          onChange={(event) => {
            setEmoji(event.target.value)
            setError((current) => (current === 'emoji' ? null : current))
          }}
        />
      ) : (
        upload({
          label: t('admin.settings.reaction_add'),
          onUploaded: (url) => {
            setImageUrl(url)
            setPresentation('image')
            setError((current) => (current === 'image' ? null : current))
          },
        })
      )}
      {presentation === 'image' && image_url ? (
        <img loading="lazy" src={image_url} alt="" className="h-8 w-8 object-contain" />
      ) : null}
      {error === 'image' ? (
        <p className="text-sm text-danger">{t('admin.settings.appearance.image_missing')}</p>
      ) : null}
      <Button type="button" className="self-start" isDisabled={!can_add} onPress={add}>
        {t('admin.settings.reaction_add')}
      </Button>
    </div>
  )
}
