import { create } from 'zustand'

export type LoginReason = 'required' | 'expired' | 'registration_closed' | 'restricted' | 'unknown_error'

type LoginDialogState = {
  is_open: boolean
  reason: LoginReason
  open: (reason?: LoginReason) => void
  close: () => void
}

/** Клиентское состояние диалога входа: не данные сервера, поэтому не в query-кэше. */
export const useLoginDialog = create<LoginDialogState>((set) => ({
  is_open: false,
  reason: 'required',
  open: (reason = 'required') => set({ is_open: true, reason }),
  close: () => set({ is_open: false }),
}))
