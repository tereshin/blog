import { cva } from 'class-variance-authority'
import { Virtualizer, TableLayout } from 'react-aria-components/Virtualizer'
import { Table } from '@heroui/react/table'
import type { ReactNode } from 'react'
import { Button } from './Button.tsx'
import { ErrorState } from './ErrorState.tsx'
import { Skeleton } from './Skeleton.tsx'
const table_content_class = cva(undefined, {
  variants: {
    is_virtual: {
      true: 'h-[480px] overflow-auto',
      false: 'min-w-[640px]',
    },
  },
})

export type DataColumn<TItem> = { id: string; label: string; render: (item: TItem) => ReactNode }
export type DataTableProps<TItem> = {
  label: string
  items: readonly TItem[]
  columns: readonly DataColumn<TItem>[]
  getKey: (item: TItem) => string
  empty: ReactNode
  is_loading?: boolean
  error?: { title: string; onRetry: () => void }
  pagination?: { label: string; is_loading: boolean; onLoadMore: () => void }
}
export function DataTable<TItem>({
  label,
  items,
  columns,
  getKey,
  empty,
  is_loading,
  error,
  pagination,
}: DataTableProps<TItem>) {
  if (is_loading) return <Skeleton className="h-56" aria-label={label} />
  if (error) return <ErrorState {...error} />
  const content = (
    <Table.Content
      aria-label={label}
      className={table_content_class({ is_virtual: items.length > 100 })}
    >
      <Table.Header>
        {columns.map((column, index) => (
          <Table.Column key={column.id} id={column.id} isRowHeader={index === 0}>
            {column.label}
          </Table.Column>
        ))}
      </Table.Header>
      <Table.Body renderEmptyState={() => empty}>
        {items.map((item) => (
          <Table.Row key={getKey(item)} id={getKey(item)}>
            {columns.map((column) => (
              <Table.Cell key={column.id}>{column.render(item)}</Table.Cell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Content>
  )
  return (
    <div className="min-w-0 max-w-full overflow-x-auto">
      <Table variant="secondary" className="min-w-0">
        <Table.ScrollContainer>
          {items.length > 100 ? (
            <Virtualizer layout={TableLayout} shouldObserveItemSize>
              {content}
            </Virtualizer>
          ) : (
            content
          )}
        </Table.ScrollContainer>
        {pagination ? (
          <Table.Footer>
            <Button
              variant="ghost"
              isDisabled={pagination.is_loading}
              onPress={pagination.onLoadMore}
            >
              {pagination.label}
            </Button>
          </Table.Footer>
        ) : null}
      </Table>
    </div>
  )
}
