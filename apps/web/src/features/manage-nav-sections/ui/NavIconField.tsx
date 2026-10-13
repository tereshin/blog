import { useRef } from 'react'
import { NavItemIcon } from '@/entities/nav-section'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'
import { readNavIconFile } from '../lib/read-nav-icon.ts'

type NavIconFieldProps = {
  icon: string | null
  error?: string
  onChange: (icon: string | null) => void
  onInvalid: () => void
}

export function NavIconField({ icon, error, onChange, onInvalid }: NavIconFieldProps) {
  const { t } = useT()
  const input_ref = useRef<HTMLInputElement>(null)
  return (
    <div className="flex flex-col gap-2">
      <p className="text-base font-semibold leading-6">{t('nav.sections.icon')}</p>
      <div className="flex flex-wrap items-center gap-3">
        {icon ? <NavItemIcon svg={icon} size={24} /> : null}
        <input
          ref={input_ref}
          type="file"
          accept=".svg,image/svg+xml"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (!file) return
            void readNavIconFile(file).then((svg) => {
              if (!svg) {
                onInvalid()
                return
              }
              onChange(svg)
            })
          }}
        />
        <Button type="button" variant="secondary" onPress={() => input_ref.current?.click()}>
          {icon ? t('nav.sections.icon_replace') : t('nav.sections.icon_upload')}
        </Button>
        {icon ? (
          <Button type="button" variant="ghost" onPress={() => onChange(null)}>
            {t('nav.sections.icon_remove')}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
