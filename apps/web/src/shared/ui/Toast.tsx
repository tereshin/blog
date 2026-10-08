import { Toast as HeroToast, toast } from '@heroui/react/toast'
import { useMemo } from 'react'
import type { ReactNode } from 'react'

export type ToastApi = {
  show: (message: string) => void
  success: (message: string) => void
  error: (message: string, description?: string) => void
}

/** Контейнер всплывающих сообщений; монтируется один раз в `AppProviders`. */
export function ToastProvider({ children }: { children?: ReactNode }) {
  return (
    <>
      {children}
      <HeroToast.Provider />
    </>
  )
}

export function useToast(): ToastApi {
  return useMemo<ToastApi>(
    () => ({
      show: (message) => void toast(message),
      success: (message) => void toast.success(message),
      error: (message, description) => void toast.danger(message, description ? { description } : undefined),
    }),
    [],
  )
}
