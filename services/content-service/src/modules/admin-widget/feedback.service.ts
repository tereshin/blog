import { z } from 'zod'
import { feedbackDeliverySchema, type FeedbackSubmission } from '@blog/contracts'
import { AppError } from '@blog/errors'
import type { FeedbackRepository, ClaimFiles } from './feedback.repository.ts'
import type { WidgetService } from './widget.service.ts'
const invalid = () =>
  new AppError({
    code: 'invalid_feedback',
    http_status: 422,
    message: 'Check form fields and attachments',
  })
export class FeedbackService {
  constructor(
    private readonly repository: FeedbackRepository,
    private readonly widgets: WidgetService,
    private readonly claim: ClaimFiles,
  ) {}
  async submit(input: FeedbackSubmission, key: string, correlation_id: string) {
    if (!key || key.length > 128) throw invalid()
    const widget = await this.widgets.resolve(input.widget_id, input.page_id)
    if (widget?.type !== 'adminFeedback' || input.website) throw invalid()
    const values: Record<string, string> = {}
    for (const field of widget.data.fields) {
      const value =
        field.name === 'attachments'
          ? input.attachment_ids.length
          : (input.values[field.name]?.trim() ?? '')
      if ((!field.is_visible && value) || (field.is_visible && field.is_required && !value))
        throw invalid()
      if (field.name !== 'attachments' && field.is_visible && typeof value === 'string') {
        if (field.name === 'email' && value && !z.email().safeParse(value).success) throw invalid()
        if (field.name !== 'message' && value.length > 254) throw invalid()
        values[field.name] = value
      }
    }
    const payload = feedbackDeliverySchema.parse({
      recipient: widget.data.recipient,
      reply_to: values.email || null,
      text: widget.data.fields
        .filter((field) => field.is_visible && field.name !== 'attachments')
        .map((field) => field.label + ': ' + (values[field.name] ?? ''))
        .join('\n\n'),
      upload_token: input.upload_token,
      attachment_ids: input.attachment_ids,
    })
    return this.repository.accept(input, key, correlation_id, payload, this.claim)
  }
  delivery(id: string, token: string) {
    return this.repository.delivery(id, token)
  }
  remove(id: string, token: string) {
    return this.repository.remove(id, token)
  }
  cleanup() {
    return this.repository.cleanup()
  }
}
