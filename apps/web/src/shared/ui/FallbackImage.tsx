import { useState } from 'react'

type FallbackImageProps = {
  src: string
  label: string
  className?: string
  /** Рядом уже есть текстовое имя: сломанная картинка его не повторяет. */
  hide_label?: boolean
}

/** Картинка. Если адрес пустой или файл не загрузился, на её месте видно `label`. */
export function FallbackImage({ src, label, className, hide_label = false }: FallbackImageProps) {
  const [is_broken, setBroken] = useState(false)
  if (src.length === 0 || is_broken) {
    if (hide_label) return null
    return <span>{label}</span>
  }
  return <img src={src} alt="" className={className} onError={() => setBroken(true)} />
}
