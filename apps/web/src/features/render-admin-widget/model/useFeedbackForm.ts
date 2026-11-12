import { useRef, useState } from 'react'
import type { PublicWidget } from '@blog/contracts'
import { submitFeedback, uploadFeedbackFile } from '@/entities/admin-widget'
type Widget = Extract<PublicWidget, { type: 'adminFeedback' }>
export function useFeedbackForm(widget: Widget, page_id?: string) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [files, setSelectedFiles] = useState<File[]>([])
  const [website, setWebsite] = useState('')
  const [status, setStatus] = useState<'idle' | 'pending' | 'error' | 'sent'>('idle')
  const token = useRef(crypto.randomUUID())
  const operation = useRef({ key: crypto.randomUUID(), fingerprint: '' })
  const uploaded = useRef(new Map<File, { id: string; key: string }>())
  function setFiles(next: File[]) {
    // A changed selection starts a new upload batch. Existing files expire on the server.
    if (uploaded.current.size) {
      uploaded.current.clear()
      token.current = crypto.randomUUID()
    }
    setSelectedFiles(next)
  }
  async function send() {
    if (status === 'pending') return
    setStatus('pending')
    try {
      if (
        files.length > 5 ||
        files.some((file) => file.size > 10 * 1024 * 1024) ||
        files.reduce((sum, file) => sum + file.size, 0) > 20 * 1024 * 1024
      )
        throw new Error('File limit')
      const ids: string[] = []
      for (const file of files) {
        let result = uploaded.current.get(file)
        if (!result) {
          result = { id: '', key: crypto.randomUUID() }
          uploaded.current.set(file, result)
        }
        if (!result.id) result.id = (await uploadFeedbackFile(file, token.current, result.key)).id
        ids.push(result.id)
      }
      const input = {
        widget_id: widget.id,
        ...(page_id ? { page_id } : {}),
        values,
        attachment_ids: ids,
        upload_token: token.current,
        website,
      }
      const fingerprint = JSON.stringify(input)
      if (operation.current.fingerprint && operation.current.fingerprint !== fingerprint)
        operation.current.key = crypto.randomUUID()
      operation.current.fingerprint = fingerprint
      await submitFeedback(input, operation.current.key)
      setStatus('sent')
      setValues({})
      setSelectedFiles([])
      uploaded.current.clear()
    } catch {
      setStatus('error')
    }
  }
  return { values, setValues, files, setFiles, website, setWebsite, status, send }
}
