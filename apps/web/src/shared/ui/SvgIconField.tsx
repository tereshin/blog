import { useRef, useState } from 'react'
import { navIconSvgSchema, NAV_ICON_SVG_MAX } from '@blog/contracts'
import { useT } from '@/shared/i18n'
import { Button } from './Button.tsx'
import { SvgIcon } from './SvgIcon.tsx'

export function SvgIconField({
  value,
  onChange,
}: {
  value: string | null
  onChange: (value: string | null) => void
}) {
  const { t } = useT()
  const input = useRef<HTMLInputElement>(null)
  const [is_invalid, setInvalid] = useState(false)
  async function read(file: File) {
    if (file.size > NAV_ICON_SVG_MAX * 4) {
      setInvalid(true)
      return
    }
    const parsed = navIconSvgSchema.safeParse(await file.text())
    setInvalid(!parsed.success)
    if (parsed.success) onChange(parsed.data)
  }
  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">{t('nav.sections.icon')}</span>
      <div className="flex flex-wrap items-center gap-3">
        {value ? <SvgIcon svg={value} className="size-6" /> : null}
        <input
          ref={input}
          type="file"
          accept=".svg,image/svg+xml"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void read(file).catch(() => setInvalid(true))
          }}
        />
        <Button type="button" variant="secondary" onPress={() => input.current?.click()}>
          {t(value ? 'nav.sections.icon_replace' : 'nav.sections.icon_upload')}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            onPress={() => {
              onChange(null)
              setInvalid(false)
            }}
          >
            {t('nav.sections.icon_remove')}
          </Button>
        ) : null}
      </div>
      {is_invalid ? (
        <p role="alert" className="text-sm text-danger">
          {t('nav.sections.icon_invalid')}
        </p>
      ) : null}
    </div>
  )
}
