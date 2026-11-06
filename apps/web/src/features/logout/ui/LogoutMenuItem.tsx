import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { BaseIcon, Menu } from '@/shared/ui'
import { useLogout } from '../model/useLogout.ts'

export function LogoutMenuItem() {
  const { t } = useT()
  const logout = useLogout()
  const [is_pending, setPending] = useState(false)

  return (
    <Menu.Item
      textValue={t('account.logout')}
      isDisabled={is_pending}
      onPress={() => {
        setPending(true)
        void logout().finally(() => setPending(false))
      }}
    >
      <BaseIcon name="exit_door" style="line" size={18} />
      {t('account.logout')}
    </Menu.Item>
  )
}
