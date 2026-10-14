import type { DocumentBlock } from './document-block.ts'
import { DocumentBlockView } from './document-blocks/DocumentBlockView.tsx'

/** Рендер блоков статьи. Неизвестный тип пропускается, HTML автора не вставляется как есть. */
export function BlockRenderer({ blocks }: { blocks: readonly DocumentBlock[] }) {
  return (
    <div>
      {blocks.map((block, index) => (
        <DocumentBlockView key={block.id ?? index} block={block} />
      ))}
    </div>
  )
}
