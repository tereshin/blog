import { blocksDocumentSchema, pageBlocksDocumentSchema } from '@blog/contracts'
import type { PageBlocksDocument } from '@blog/contracts'
import type { OutputData } from '@editorjs/editorjs'

export class InvalidEditorDocumentError extends Error {
  constructor(detail: string) {
    super(detail)
    this.name = 'InvalidEditorDocumentError'
  }
}

function textOf(data: OutputData['blocks'][number]['data']): string {
  const text = data['text']
  return typeof text === 'string' ? text : ''
}

/** Инструмент вложений сохраняет название как `innerHTML`; в документ идёт текст. */
function plainTitle(value: unknown): string {
  if (typeof value !== 'string') return ''
  const parsed = new DOMParser().parseFromString(value, 'text/html')
  return (parsed.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}

/** Приводит сохранение Editor.js к документу контракта. Лишние поля инструментов отбрасывает схема. */
export function parseEditorOutput(data: OutputData, admin_widgets?: boolean): PageBlocksDocument {
  const blocks = data.blocks.flatMap((block) => {
    if (admin_widgets && ['adminComments', 'adminFeedback', 'adminButtons'].includes(block.type)) {
      const { widget_id, ...settings } = block.data
      return [
        {
          id: typeof widget_id === 'string' ? widget_id : block.id,
          type: block.type,
          data: settings,
        },
      ]
    }
    if (block.type === 'paragraph' || block.type === 'header') {
      const level = block.data['level']
      const header_level = level === 3 || level === 4 ? level : 2
      return [
        {
          ...(block.id ? { id: block.id } : {}),
          type: block.type,
          data:
            block.type === 'header'
              ? { text: textOf(block.data), level: header_level }
              : { text: textOf(block.data) },
        },
      ]
    }
    if (block.type === 'delimiter')
      return [{ ...(block.id ? { id: block.id } : {}), type: 'delimiter' as const, data: {} }]
    if (block.type === 'attaches')
      return [
        {
          ...(block.id ? { id: block.id } : {}),
          type: block.type,
          data: { ...block.data, title: plainTitle(block.data['title']) },
        },
      ]
    if (block.type === 'table') {
      const data = { ...block.data }
      data.with_headings = data.with_headings ?? data.withHeadings
      delete data.withHeadings
      return [{ ...(block.id ? { id: block.id } : {}), type: block.type, data }]
    }
    return [{ ...(block.id ? { id: block.id } : {}), type: block.type, data: block.data }]
  })
  const parsed = (admin_widgets ? pageBlocksDocumentSchema : blocksDocumentSchema).safeParse({
    time: data.time,
    blocks,
    version: data.version,
  })
  if (!parsed.success) throw new InvalidEditorDocumentError(parsed.error.message)
  return parsed.data
}

/** Editor.js table tool still reads `withHeadings`; the contract stores `with_headings`. */
export function toEditorJsBlocks(blocks: PageBlocksDocument['blocks']): OutputData['blocks'] {
  return blocks.map((block) => {
    if (
      block.type === 'adminComments' ||
      block.type === 'adminFeedback' ||
      block.type === 'adminButtons'
    )
      return { ...block, data: { ...block.data, widget_id: block.id } }
    if (block.type !== 'table') {
      return { ...block, data: block.data ?? {} }
    }
    const data: Record<string, unknown> = { ...block.data }
    if (data.with_headings !== undefined) {
      data.withHeadings = data.with_headings
      delete data.with_headings
    }
    return { ...block, data }
  })
}
