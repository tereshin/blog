import type { ComponentPropsWithRef } from 'react'
import { useT } from '@/shared/i18n'
import type { Locale } from '@/shared/i18n'
import { cn } from '@/shared/lib'
import { BaseIcon } from './BaseIcon.tsx'

const TONES: Record<string, string> = {
  pdf: 'bg-danger-soft text-danger',
  rtf: 'bg-accent-soft text-accent',
  doc: 'bg-accent-soft text-accent',
  docx: 'bg-accent-soft text-accent',
  xlsx: 'bg-success-soft text-success',
  csv: 'bg-success-soft text-success',
  jpg: 'bg-warning-soft text-warning',
  jpeg: 'bg-warning-soft text-warning',
  png: 'bg-warning-soft text-warning',
  gif: 'bg-warning-soft text-warning',
}

const UNITS = ['byte', 'kilobyte', 'megabyte'] as const

function formatSize(bytes: number, locale: Locale): string {
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit++
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: UNITS[unit],
    unitDisplay: 'short',
    maximumFractionDigits: unit === 0 ? 0 : 1,
  }).format(value)
}

type AttachmentCardProps = ComponentPropsWithRef<'a'> & {
  href: string
  title: string
  extension: string | null
  size: number | null
}

/** Вложение статьи: тип файла, название, размер. Ссылка на файл площадки открывается в новой вкладке. */
export function AttachmentCard({ href, title, extension, size, className, ...rest }: AttachmentCardProps) {
  const { t, locale } = useT()
  const meta = [extension?.toUpperCase(), size !== null ? formatSize(size, locale) : null].filter(Boolean).join(' · ')
  return (
    <a
      {...rest}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      className={cn('attachment-card my-4 flex max-w-xl items-center gap-3 rounded-xl bg-surface-secondary p-3 text-foreground no-underline transition-colors hover:bg-surface-tertiary focus-visible:bg-surface-tertiary', className)}
    >
      <span
        aria-hidden
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold uppercase tracking-wide',
          (extension && TONES[extension]) ?? 'bg-surface-tertiary text-muted',
        )}
      >
        {extension && extension.length <= 4 ? extension : <BaseIcon name="document" style="line" size={22} />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="truncate font-medium inline-block leading-none">{title || t('document.attachment')}</span>
        {meta ? <span className="text-sm text-muted inline-block leading-none">{meta}</span> : null}
      </span>
      <BaseIcon name="right" style="line" size={22} className="shrink-0 text-muted" />
    </a>
  )
}
