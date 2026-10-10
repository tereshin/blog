import { useState } from 'react'
import { useT } from '@/shared/i18n'
import { Button } from '@/shared/ui'
export function CommentReportForm({
  onSubmit,
  is_pending,
  error,
}: {
  onSubmit: (reason: string) => void
  is_pending: boolean
  error: boolean
}) {
  const { t } = useT()
  const [reason, setReason] = useState('')
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (reason.trim().length >= 3) onSubmit(reason.trim())
      }}
    >
      <label className="flex flex-col gap-2 text-sm">
        {t('comment.report_reason')}
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          minLength={3}
          maxLength={1000}
          required
          rows={4}
          className="rounded-xl border border-separator bg-surface-secondary p-3"
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {t('error.unknown')}
        </p>
      ) : null}
      <Button type="submit" variant="primary" isDisabled={reason.trim().length < 3 || is_pending}>
        {t('comment.report_submit')}
      </Button>
    </form>
  )
}
