import type { Profile } from '@/entities/profile'
import { useSettings } from '@/entities/settings'
import { useUpdateProfile } from '@/features/edit-profile'
import { useT } from '@/shared/i18n'
import { Button, Menu } from '@/shared/ui'

export function ProfileStatus({ profile }: { profile: Profile }) {
  const { t } = useT()
  const { data } = useSettings()
  const update = useUpdateProfile()
  const icons = data?.profile_status_icons ?? []
  const selected = icons.find((icon) => icon.id === profile.status_icon_id)

  if (icons.length === 0) return null
  if (!profile.is_own) return selected ? (
    <img src={selected.image_url} alt={selected.label} title={selected.label} width={28} height={28} className="size-7 shrink-0 object-contain" />
  ) : null

  return (
    <div className="shrink-0">
      <Menu>
        <Button variant="ghost" isIconOnly isDisabled={update.isPending} aria-label={t('profile.status_choose')} className="size-7 min-h-7 min-w-7 p-0">
          {selected ? (
            <img src={selected.image_url} alt={selected.label} width={28} height={28} className="size-7 object-contain" />
          ) : <span aria-hidden="true" className="text-xl">＋</span>}
        </Button>
        <Menu.Content
          aria-label={t('profile.status_choose')}
          selectionMode="single"
          selectedKeys={[selected?.id ?? 'none']}
          onAction={(key) => {
            if (update.isPending) return
            if (key === 'none' || icons.some((icon) => icon.id === key)) {
              update.mutate({ status_icon_id: key === 'none' ? null : String(key) })
            }
          }}
        >
          <Menu.Item id="none" textValue={t('profile.status_none')}>{t('profile.status_none')}</Menu.Item>
          {icons.map((icon) => (
            <Menu.Item key={icon.id} id={icon.id} textValue={icon.label}>
              <span className="flex items-center gap-2">
                <img src={icon.image_url} alt="" width={24} height={24} className="size-6 object-contain" />
                {icon.label}
              </span>
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu>
      {update.isError ? <p role="alert" className="text-sm text-danger">{t('profile.error.save')}</p> : null}
    </div>
  )
}
