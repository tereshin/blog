import { Skeleton as HeroSkeleton } from '@heroui/react/skeleton'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib'

const skeleton_variants = cva('', {
  variants: {
    shape: { line: 'h-4 w-full rounded-md', block: 'h-24 w-full rounded-card', circle: 'size-10 rounded-avatar' },
  },
  defaultVariants: { shape: 'line' },
})

export type SkeletonProps = ComponentProps<typeof HeroSkeleton> & VariantProps<typeof skeleton_variants>

/** Серая заготовка: размер задаётся формой и `className`. */
export function Skeleton({ shape, className, ...rest }: SkeletonProps) {
  return <HeroSkeleton className={cn(skeleton_variants({ shape }), className as string | undefined)} {...rest} />
}
