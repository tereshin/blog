import { useSettings } from '@/entities/settings'
import { BlockRenderer, Card } from '@/shared/ui'

export function WelcomeCard() {
  const { data } = useSettings()
  const content = data?.welcome_content
  if (!content || (!content.title && content.document.blocks.length === 0)) return null
  return (
    <Card className="mb-4 lg:mb-6">
      {content.title ? (
        <Card.Header>
          <Card.Title>{content.title}</Card.Title>
        </Card.Header>
      ) : null}
      <Card.Content className="py-0">
        <BlockRenderer blocks={content.document.blocks} />
      </Card.Content>
    </Card>
  )
}
