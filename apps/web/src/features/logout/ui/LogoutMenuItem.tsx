import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { Menu } from '@/shared/ui'
import { useLogout } from '../model/useLogout.ts'

export function LogoutMenuItem() {
  const { t } = useT()
  const logout = useLogout()
  const [is_pending, setPending] = useState(false)

  return (
    <Menu.Item
      isDisabled={is_pending}
      onPress={() => {
        setPending(true)
        void logout().finally(() => setPending(false))
      }}
    >
      {t('account.logout')}
    </Menu.Item>
  )
}
