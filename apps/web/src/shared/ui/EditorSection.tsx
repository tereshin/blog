import type { ReactNode } from 'react'
import { Accordion } from '@heroui/react/accordion'
import { Card } from './Card.tsx'
export function EditorSection({
  id,
  title,
  count,
  actions,
  children,
}: {
  id: string
  title: string
  count: number
  actions: ReactNode
  children: ReactNode
}) {
  return (
    <Card>
      <Card.Content className="relative p-3">
        <div>
          <Accordion className="min-w-0" hideSeparator>
            <Accordion.Item id={id}>
              <Accordion.Heading>
                <Accordion.Trigger aria-label={title} className="gap-2 py-2 pr-12">
                  <span className="min-w-0 flex-1 truncate text-left font-medium">{title}</span>
                  <span className="text-sm text-muted">{count}</span>
                  <Accordion.Indicator />
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body className="grid gap-3 px-0 pt-3">{children}</Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
          <div className="absolute top-3 right-3">{actions}</div>
        </div>
      </Card.Content>
    </Card>
  )
}
