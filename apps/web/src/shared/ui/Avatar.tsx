import { Avatar as HeroAvatar } from '@heroui/react/avatar'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib'

const avatar_variants = cva('rounded-avatar', {
  variants: {
    ring: { none: '', accent: 'ring-2 ring-accent ring-offset-2 ring-offset-background' },
  },
  defaultVariants: { ring: 'none' },
})

export type AvatarProps = Omit<ComponentProps<typeof HeroAvatar>, 'children'> &
  VariantProps<typeof avatar_variants> & {
    /** Пустой `src` или ошибка загрузки — показываются инициалы. */
    src?: string | null | undefined
    name: string
  }

function getInitials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
  return letters.join('') || '?'
}

/** Круглый аватар; `name` обязателен для подписи и инициалов. */
export function Avatar({ src, name, ring, className, ...rest }: AvatarProps) {
  return (
    <HeroAvatar className={cn(avatar_variants({ ring }), className as string | undefined)} {...rest}>
      {src ? <HeroAvatar.Image src={src} alt={name} /> : null}
      <HeroAvatar.Fallback>{getInitials(name)}</HeroAvatar.Fallback>
    </HeroAvatar>
  )
}
