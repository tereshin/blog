import { useState } from 'react'
import type { ReactNode } from 'react'

type FallbackImageProps = {
  src: string
  label: string
  className?: string
  /** Если картинка не загрузилась: слот вместо подписи `label`. */
  fallback?: ReactNode
}

/** Картинка. Если адрес пустой или файл не загрузился, на её месте видно `label` или `fallback`. */
export function FallbackImage({ src, label, className, fallback }: FallbackImageProps) {
  const [is_broken, setBroken] = useState(false)
  if (src.length === 0 || is_broken) {
    return fallback === undefined ? <span>{label}</span> : fallback
  }
  return <img src={src} alt="" loading="lazy" decoding="async" className={className} onError={() => setBroken(true)} />
}
