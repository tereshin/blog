import { blocksDocumentSchema } from '@blog/contracts'
import type { BlocksDocument } from '@blog/contracts'
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

/** Приводит сохранение Editor.js к документу контракта. Лишние поля инструментов отбрасывает схема. */
export function parseEditorOutput(data: OutputData): BlocksDocument {
  const blocks = data.blocks.flatMap((block) => {
    if (block.type === 'paragraph' || block.type === 'header') {
      const level = block.data['level']
      const header_level = level === 3 || level === 4 ? level : 2
      return [
        {
          ...(block.id ? { id: block.id } : {}),
          type: block.type,
          data: block.type === 'header' ? { text: textOf(block.data), level: header_level } : { text: textOf(block.data) },
        },
      ]
    }
    if (block.type === 'delimiter') return [{ ...(block.id ? { id: block.id } : {}), type: 'delimiter' as const, data: {} }]
    return [{ ...(block.id ? { id: block.id } : {}), type: block.type, data: block.data }]
  })
  const parsed = blocksDocumentSchema.safeParse({ time: data.time, blocks, version: data.version })
  if (!parsed.success) throw new InvalidEditorDocumentError(parsed.error.message)
  return parsed.data
}
