import { useState } from 'react'
import type { Profile } from '@/entities/profile'
import { useSettings } from '@/entities/settings'
import { useUpdateProfile } from '@/features/edit-profile'
import { useT } from '@/shared/i18n'
import { BaseIcon, Button, ListBox, Popover } from '@/shared/ui'

export function ProfileStatus({ profile }: { profile: Profile }) {
  const { t } = useT()
  const [is_open, setOpen] = useState(false)
  const { data } = useSettings()
  const update = useUpdateProfile()
  const icons = data?.profile_status_icons ?? []
  const selected = icons.find((icon) => icon.id === profile.status_icon_id)
  const handleSelect = (key: string | number) => {
    if (update.isPending) return
    if (key === 'none' || icons.some((icon) => icon.id === key)) {
      update.mutate({ status_icon_id: key === 'none' ? null : String(key) })
      setOpen(false)
    }
  }

  if (icons.length === 0) return null
  if (!profile.is_own) return selected ? (
    <img loading="lazy" src={selected.image_url} alt={selected.label} title={selected.label} width={28} height={28} className="size-7 shrink-0 object-contain" />
  ) : null

  return (
    <div className="shrink-0">
      <Popover isOpen={is_open} onOpenChange={setOpen}>
        <Button variant="ghost" size="sm" isIconOnly isDisabled={update.isPending} aria-label={t('profile.status_choose')} className="size-7 min-h-7 min-w-7 p-0 top-[2px]">
          {selected ? (
            <img loading="lazy" src={selected.image_url} alt={selected.label} width={22} height={22} className="size-5 object-contain" />
          ) : <BaseIcon name="add" style="fill" size={22} />}
        </Button>
        <Popover.Content placement="top" offset={8} className="icon-picker p-1">
          <ListBox
            autoFocus
            disallowEmptySelection
            layout="grid"
            className="icon-picker__grid"
            disabledKeys={update.isPending ? ['none', ...icons.map((icon) => icon.id)] : []}
            aria-label={t('profile.status_choose')}
            selectionMode="single"
            selectedKeys={[selected?.id ?? 'none']}
            onSelectionChange={(keys) => {
              const key = keys === 'all' ? undefined : [...keys][0]
              if (key !== undefined) handleSelect(key)
            }}
          >
            <ListBox.Item id="none" textValue={t('profile.status_none')} aria-label={t('profile.status_none')} className="icon-picker__item">
              <span title={t('profile.status_none')}>{t('profile.status_none')}</span>
            </ListBox.Item>
            {icons.map((icon) => (
              <ListBox.Item key={icon.id} id={icon.id} textValue={icon.label} aria-label={icon.label} className="icon-picker__item">
                <span title={icon.label} className="inline-flex items-center justify-center">
                  <img loading="lazy" src={icon.image_url} alt="" width={36} height={36} className="size-9 object-contain" />
                </span>
              </ListBox.Item>
            ))}
          </ListBox>
        </Popover.Content>
      </Popover>
      {update.isError ? <p role="alert" className="text-sm text-danger">{t('profile.error.save')}</p> : null}
    </div>
  )
}
