import { use, useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { useContextProps } from 'react-aria-components'
import { FieldInputContext } from 'react-aria-components/Autocomplete'
import type { useCommentDrafts } from '../model/useCommentDrafts.ts'
import type { useCommentMentions } from '../model/useCommentMentions.ts'
import { editorSelection, setEditorSelection } from '../lib/comment-editor.ts'

type CommentEditorProps = {
  draft: ReturnType<typeof useCommentDrafts>
  mention: ReturnType<typeof useCommentMentions>
  field_ref: RefObject<HTMLDivElement | null>
  label: string
  placeholder: string
  auto_focus: boolean
}

export function CommentEditor({
  draft,
  mention,
  field_ref,
  label,
  placeholder,
  auto_focus,
}: CommentEditorProps) {
  const input = use(FieldInputContext)
  const [, editor_ref] = useContextProps({}, field_ref, FieldInputContext)
  const pending_caret = useRef<{ start: number; end: number } | null>(null)
  useLayoutEffect(() => {
    const element = field_ref.current
    if (!element) return
    const pending = pending_caret.current
    pending_caret.current = null
    const selection = pending ?? editorSelection(element)
    const fragment = document.createDocumentFragment()
    let offset = 0
    for (const range of [...draft.mention_ranges].sort((a, b) => a.start - b.start)) {
      fragment.append(document.createTextNode(draft.text.slice(offset, range.start)))
      const span = document.createElement('span')
      span.className = 'comment-composer__mention'
      span.dataset.mentionId = range.user.user_id
      span.textContent = draft.text.slice(range.start, range.end)
      fragment.append(span)
      offset = range.end
    }
    fragment.append(document.createTextNode(draft.text.slice(offset)))
    element.replaceChildren(fragment)
    if (selection) setEditorSelection(element, selection.start, selection.end)
  }, [draft.text, draft.mention_ranges, field_ref])
  useLayoutEffect(() => {
    if (auto_focus) field_ref.current?.focus()
  }, [auto_focus, field_ref])
  const updateCaret = () => {
    const selection = editorSelection(field_ref.current)
    if (selection) mention.updateCaret(selection.start)
  }
  return (
    <div
      ref={editor_ref as RefObject<HTMLDivElement | null>}
      role="textbox"
      aria-label={label}
      aria-multiline="true"
      aria-controls={input && 'aria-controls' in input ? input['aria-controls'] : undefined}
      aria-activedescendant={
        input && 'aria-activedescendant' in input ? input['aria-activedescendant'] : undefined
      }
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      className="comment-composer__input"
      onInput={(event) => {
        const text = event.currentTarget.innerText.replace(/\r/g, '')
        const selection = editorSelection(event.currentTarget)
        draft.update(text)
        mention.updateCaret(selection?.start ?? text.length)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !mention.is_open && !event.nativeEvent.isComposing) {
          event.preventDefault()
          const selection = editorSelection(field_ref.current)
          const start = selection?.start ?? draft.text.length
          const end = selection?.end ?? start
          pending_caret.current = { start: start + 1, end: start + 1 }
          draft.update(draft.text.slice(0, start) + '\n' + draft.text.slice(end))
          return
        }

        if (mention.is_open && input && 'onKeyDown' in input)
          input.onKeyDown?.(Object.assign(event, { continuePropagation: () => undefined }))
      }}
      onKeyUp={(event) => {
        if (!mention.is_open || !['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key))
          updateCaret()
      }}
      onMouseUp={updateCaret}
      onPaste={(event) => {
        event.preventDefault()
        const element = field_ref.current
        const selection = editorSelection(element)
        const start = selection?.start ?? draft.text.length
        const end = selection?.end ?? start
        const inserted = event.clipboardData.getData('text/plain')
        const caret = Math.min(start + inserted.length, 5000)
        pending_caret.current = { start: caret, end: caret }
        draft.update(draft.text.slice(0, start) + inserted + draft.text.slice(end))
      }}
      onCompositionStart={() => mention.setComposing(true)}
      onCompositionEnd={() => mention.setComposing(false)}
    />
  )
}
