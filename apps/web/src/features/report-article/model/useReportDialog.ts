import { useState } from 'react'

export function useReportDialog(): { is_open: boolean; open: () => void; onOpenChange: (is_open: boolean) => void } {
  const [is_open, setOpen] = useState(false)
  return { is_open, open: () => setOpen(true), onOpenChange: setOpen }
}
