import type { DocumentBlock } from '../document-block.ts'
import { InlineHtml } from './InlineHtml.tsx'

type TableViewProps = { data: DocumentBlock['data'] }

export function TableView({ data }: TableViewProps) {
  const rows = Array.isArray(data?.content) ? (data.content as unknown[]) : []
  return (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map((row, row_index) => (
            <tr key={row_index}>
              {(Array.isArray(row) ? row : []).map((cell, cell_index) => {
                const Cell = data?.withHeadings === true && row_index === 0 ? 'th' : 'td'
                return (
                  <Cell key={cell_index} className="border border-separator px-2 py-1 text-left">
                    <InlineHtml html={typeof cell === 'string' ? cell : ''} />
                  </Cell>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
