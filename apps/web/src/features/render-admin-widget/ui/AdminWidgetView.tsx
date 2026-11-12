import type { PublicWidget } from '@blog/contracts'
import { CommentsWidgetView } from './CommentsWidgetView.tsx'
import { ButtonsWidgetView } from './ButtonsWidgetView.tsx'
import { FeedbackWidgetView } from './FeedbackWidgetView.tsx'
export function AdminWidgetView({
  widget,
  page_id,
  is_preview,
}: {
  widget: PublicWidget
  page_id?: string
  is_preview?: boolean
}) {
  switch (widget.type) {
    case 'adminComments':
      return <CommentsWidgetView data={widget.data} />
    case 'adminButtons':
      return <ButtonsWidgetView data={widget.data} is_preview={is_preview} />
    case 'adminFeedback':
      return <FeedbackWidgetView widget={widget} page_id={page_id} is_preview={is_preview} />
  }
}
