import { Fragment, type ReactNode } from 'react'
import type { DocumentBlock } from './document-block.ts'
import { DocumentBlockView } from './document-blocks/DocumentBlockView.tsx'

/** Рендер блоков статьи. Неизвестный тип пропускается, HTML автора не вставляется как есть. */
export function BlockRenderer({ blocks, renderBlock }: { blocks: readonly DocumentBlock[]; renderBlock?: (block: DocumentBlock) => ReactNode }) {
  return (
    <div className="document-content">
      {blocks.map((block, offset) => (
        <Fragment key={block.id ?? `${block.type}-${offset}`}>{renderBlock?.(block) ?? <DocumentBlockView block={block} />}</Fragment>
      ))}
    </div>
  )
}
