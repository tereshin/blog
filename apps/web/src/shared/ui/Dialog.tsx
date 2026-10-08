import { Modal } from '@heroui/react/modal'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/shared/lib'

type DialogProps = {
  is_open: boolean
  onOpenChange: (is_open: boolean) => void
  size?: ComponentProps<typeof Modal.Container>['size']
  /** Имя окна для скринридера, если внутри нет `Dialog.Heading`. */
  'aria-label'?: string
  className?: string
  children: ReactNode
}

/**
 * Диалог поверх текущего адреса: Escape закрывает, фокус остаётся внутри,
 * по закрытию возвращается на кнопку, открывшую окно (даёт React Aria).
 */
function DialogRoot({ is_open, onOpenChange, size, className, children, ...rest }: DialogProps) {
  return (
    // Управляемое окно без кнопки-триггера внутри: корневой `Modal` не нужен (он ждал бы триггер).
    <Modal.Backdrop isOpen={is_open} onOpenChange={onOpenChange}>
      <Modal.Container {...(size ? { size } : {})}>
        <Modal.Dialog className={cn('rounded-card', className)} aria-label={rest['aria-label']}>
          {children}
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}

export const Dialog = Object.assign(DialogRoot, {
  CloseTrigger: Modal.CloseTrigger,
  Header: Modal.Header,
  Heading: Modal.Heading,
  Body: Modal.Body,
  Footer: Modal.Footer,
})
