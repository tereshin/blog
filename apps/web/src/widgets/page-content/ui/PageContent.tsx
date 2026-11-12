import { publicWidgetSchema } from '@blog/contracts'
import type { PublicPage } from '@blog/contracts'
import { AdminWidgetView } from '@/features/render-admin-widget'
import { BlockRenderer } from '@/shared/ui'
export function PageContent({ page }: { page: PublicPage }) {
  return (
    <BlockRenderer
      blocks={page.blocks.blocks}
      renderBlock={(block) => {
        const widget = publicWidgetSchema.safeParse(block)
        return widget.success ? (
          <div className="my-4">
            <AdminWidgetView widget={widget.data} page_id={page.id} />
          </div>
        ) : null
      }}
    />
  )
}
