import { useSettingsBadges } from '../model/useSettingsBadges.ts'
import type { ReactNode } from 'react'
import type { BadgeDefinition } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { Button, FormTextField, SelectField } from '@/shared/ui'

type SettingsBadgeFieldsProps = {
  badges: BadgeDefinition[]
  can_edit_media: boolean
  upload: (options: { label: string; onUploaded: (url: string) => void }) => ReactNode
  onChange: (update: (badges: BadgeDefinition[]) => BadgeDefinition[]) => void
}

export function SettingsBadgeFields({
  badges,
  can_edit_media,
  upload,
  onChange,
}: SettingsBadgeFieldsProps) {
  const { t } = useT()
  const { patch, move } = useSettingsBadges(badges, onChange)
  return (
    <fieldset disabled={!can_edit_media} className="flex flex-col gap-8 border-0 p-0">
      <legend className="sr-only">{t('admin.settings.badges')}</legend>
      <p className="text-sm text-muted">{t('admin.settings.badges_hint')}</p>
      {badges.map((badge, index) => (
        <div
          key={badge.id}
          role="group"
          aria-label={badge.label}
          className="flex flex-col gap-4 border-b border-separator pb-6"
        >
          <div className="flex items-center gap-3">
            <img
              src={badge.image_url}
              alt=""
              width={32}
              height={32}
              className="size-8 object-contain"
            />
            <span>
              {badge.status === 'archived' ? t('admin.badges.archived') : t('admin.badges.active')}
            </span>
          </div>
          <FormTextField
            label={t('admin.badges.label')}
            required
            maxLength={100}
            value={badge.label}
            onChange={(event) => patch(badge.id, { label: event.target.value })}
          />
          <SelectField
            label={t('admin.badges.metric')}
            value={badge.trigger.metric}
            options={(['published_posts', 'reputation', 'membership_months'] as const).map(
              (value) => ({ value, label: t(`admin.badges.${value}`) }),
            )}
            onChange={(metric) => {
              if (
                metric === 'published_posts' ||
                metric === 'reputation' ||
                metric === 'membership_months'
              )
                patch(badge.id, { trigger: { ...badge.trigger, metric } })
            }}
          />
          <FormTextField
            label={t('admin.badges.threshold')}
            type="number"
            min={1}
            max={120000}
            step={1}
            required
            value={badge.trigger.threshold}
            onChange={(event) =>
              patch(badge.id, {
                trigger: { ...badge.trigger, threshold: Number(event.target.value) },
              })
            }
          />
          {can_edit_media ? (
            <div className="flex flex-wrap gap-2">
              {upload({
                label: t('admin.badges.replace'),
                onUploaded: (image_url) => patch(badge.id, { image_url }),
              })}
              <Button
                type="button"
                variant="ghost"
                onPress={() =>
                  patch(badge.id, { status: badge.status === 'active' ? 'archived' : 'active' })
                }
              >
                {t(badge.status === 'active' ? 'admin.badges.archive' : 'admin.badges.restore')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                isDisabled={index === 0}
                onPress={() => move(index, -1)}
              >
                {t('admin.badges.up')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                isDisabled={index === badges.length - 1}
                onPress={() => move(index, 1)}
              >
                {t('admin.badges.down')}
              </Button>
            </div>
          ) : null}
        </div>
      ))}
      {can_edit_media && badges.length < 100
        ? upload({
            label: t('admin.badges.add'),
            onUploaded: (image_url) =>
              onChange((current) =>
                current.length >= 100
                  ? current
                  : [
                      ...current,
                      {
                        id: crypto.randomUUID(),
                        label: t('admin.badges.new'),
                        image_url,
                        status: 'active',
                        trigger: { metric: 'published_posts', threshold: 1 },
                      },
                    ],
              ),
          })
        : null}
    </fieldset>
  )
}
