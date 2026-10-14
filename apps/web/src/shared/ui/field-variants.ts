import { cva } from 'class-variance-authority'
export type FieldAppearance = { size?: 'base' | 'lg'; variant?: 'primary' | 'secondary' }
export const fieldStackVariants = cva('flex w-full min-w-0 max-w-lg flex-col', {
  variants: { size: { base: 'gap-2', lg: 'gap-3' } },
  defaultVariants: { size: 'lg' },
})
export const fieldVariants = cva('form-control w-full min-w-0', {
  variants: {
    size: {
      base: 'form-control--base rounded-xl px-3 text-sm',
      lg: 'form-control--lg rounded-2xl px-4 text-base',
    },
    variant: { primary: 'form-control--primary', secondary: 'form-control--secondary' },
  },
  defaultVariants: { size: 'base', variant: 'primary' },
})
