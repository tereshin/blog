import { decodeHTML } from 'entities'
import { blocksDocumentSchema } from '@blog/contracts'
import type { ListItem } from '@blog/contracts'

export function plainText(value: string): string {
  return decodeHTML(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

export function shortDescription(value: string): string {
  const chars = Array.from(plainText(value))
  return chars.length > 160 ? `${chars.slice(0, 159).join('').trimEnd()}…` : chars.join('')
}

function listText(items: ListItem[]): string {
  return items.map((item) => typeof item === 'string' ? item : `${item.content} ${listText(item.items ?? [])}`).join(' ')
}

export function documentText(value: unknown): string {
  const parsed = blocksDocumentSchema.safeParse(value)
  if (!parsed.success) return ''
  return parsed.data.blocks.map((block) => {
    switch (block.type) {
      case 'paragraph': case 'header': return plainText(block.data.text)
      case 'quote': return plainText(`${block.data.text} ${block.data.caption ?? ''}`)
      case 'list': return plainText(listText(block.data.items))
      case 'warning': return plainText(`${block.data.title} ${block.data.message}`)
      case 'code': return block.data.code
      case 'table': return plainText(block.data.content.flat().join(' '))
      case 'image': return plainText(block.data.caption ?? '')
      case 'attaches': return plainText(block.data.title)
      case 'personality': return plainText(`${block.data.name} ${block.data.position ?? ''}`)
      default: return ''
    }
  }).filter(Boolean).join('\n')
}
