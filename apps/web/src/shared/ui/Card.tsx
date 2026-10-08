import { Card as HeroCard } from '@heroui/react/card'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib'

type CardProps = ComponentProps<typeof HeroCard>

function CardRoot({ className, ...rest }: CardProps) {
  return <HeroCard className={cn('rounded-card', className)} {...rest} />
}

type CardPartProps<TKey extends 'Header' | 'Content' | 'Footer'> = ComponentProps<(typeof HeroCard)[TKey]>

function CardHeader({ className, ...rest }: CardPartProps<'Header'>) {
  return <HeroCard.Header className={cn('px-4 pt-4', className)} {...rest} />
}

function CardContent({ className, ...rest }: CardPartProps<'Content'>) {
  return <HeroCard.Content className={cn('px-4 py-3', className)} {...rest} />
}

function CardFooter({ className, ...rest }: CardPartProps<'Footer'>) {
  return <HeroCard.Footer className={cn('px-4 pb-4', className)} {...rest} />
}

/** Карточка: `Card.Header`, `Card.Content`, `Card.Footer` собираются свободно. */
export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: HeroCard.Title,
  Description: HeroCard.Description,
  Content: CardContent,
  Footer: CardFooter,
})
