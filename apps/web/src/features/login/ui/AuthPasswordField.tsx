import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { Button, EyeIcon, Input } from '@/shared/ui'
import type { AuthPanel } from '../model/useLoginDialogView.ts'

export function AuthPasswordField({ panel }: { panel: AuthPanel }) {
  const { t } = useT()
  const [is_visible, setVisible] = useState(false)
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="sr-only">{t('login.password')}</span>
      <Input autoFocus size="lg" variant="secondary" type={is_visible ? 'text' : 'password'}
        placeholder={t('login.password')} aria-invalid={panel.field_error === 'password'}
        aria-describedby={panel.field_error === 'password' ? 'auth-password-error' : undefined}
        autoComplete={panel.phase === 'password_setup' ? 'new-password' : 'current-password'}
        value={panel.password} maxLength={1024} disabled={panel.is_submitting} className="w-full"
        onChange={(event) => panel.setPassword(event.target.value)}
        suffix={<Button type="button" variant="ghost" isIconOnly size="sm" aria-pressed={is_visible}
          aria-label={t(is_visible ? 'login.hide_password' : 'login.show_password')}
          onPress={() => setVisible(!is_visible)}><EyeIcon /></Button>} />
      {panel.field_error === 'password' ? <span id="auth-password-error" role="alert" className="text-danger">{t('login.field.password')}</span> : null}
    </label>
  )
}
