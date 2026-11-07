import { useEffect, useState } from 'react'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'
import type { AuthPanel } from '../model/useLoginDialogView.ts'

const CODE_POSITIONS = [0, 1, 2, 3, 4, 5] as const

export function AuthCodeField({ panel }: { panel: AuthPanel }) {
  const { t } = useT()
  const [now, setNow] = useState(Date.now)
  const remaining = Math.max(0, Math.ceil((panel.resend_deadline - now) / 1000))
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [panel.resend_deadline])
  return (
    <div className="flex flex-col items-center gap-4">
      <label className="auth-code" aria-label={t('login.code.label')}>
        <input autoFocus type="text" inputMode="numeric" autoComplete="one-time-code"
          aria-label={t('login.code.label')} aria-invalid={Boolean(panel.notice_key)}
          className="auth-code__input" value={panel.code} readOnly={panel.is_submitting}
          onChange={(event) => void panel.handleCodeChange(event.target.value)}
          onPaste={(event) => {
            event.preventDefault()
            void panel.handleCodeChange(event.clipboardData.getData('text'))
          }} />
        <span className="auth-code__cells" aria-hidden="true">
          {CODE_POSITIONS.map((position) => (
            <span key={position} className="auth-code__cell" data-active={position === Math.min(panel.code.length, 5)}>
              {panel.code[position] ?? ''}
            </span>
          ))}
        </span>
      </label>
      <Button type="button" variant="ghost" className="auth-code__resend" isDisabled={remaining > 0 || panel.is_submitting}
        onPress={() => void panel.handleResendCode()}>
        {remaining > 0 ? t('login.code.resend_in', { seconds: remaining }) : t('login.code.resend')}
      </Button>
    </div>
  )
}
