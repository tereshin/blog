import { MemoryRouter } from 'react-router'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import type { BlockToolConstructorOptions } from '@editorjs/editorjs'
import { adminWidgetSchema, type AdminWidget } from '@blog/contracts'
import { WidgetSettings, defaultWidget } from '@/entities/admin-widget'
import { AdminWidgetPreview } from '@/features/render-admin-widget'
import { I18nProvider, translate, type Locale } from '@/shared/i18n'
type Config = { locale: Locale; query_client: QueryClient }
const icon =
  '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"><rect x="2" y="2" width="16" height="16" rx="3"/><path d="M6 7h8M6 10h8M6 13h5"/></svg>'
export function adminWidgetTools(config: Config) {
  function tool(type: AdminWidget['type']) {
    return class AdminWidgetTool {
      static get toolbox() {
        return { title: translate(config.locale, `widgets.${type}`), icon }
      }
      static get isReadOnlySupported() {
        return true
      }
      private widget: AdminWidget
      private root: Root | undefined
      private readonly read_only: boolean
      private readonly block: BlockToolConstructorOptions['block']
      constructor(options: BlockToolConstructorOptions) {
        this.block = options.block
        this.read_only = options.readOnly
        const raw = options.data as Record<string, unknown>
        const { widget_id, ...data } = raw
        const parsed = adminWidgetSchema.safeParse({ id: widget_id, type, data })
        this.widget = parsed.success ? parsed.data : defaultWidget(type)
      }
      render() {
        const holder = document.createElement('div')
        holder.contentEditable = 'false'
        holder.className = 'my-4 rounded-lg border border-separator p-4'
        this.root = createRoot(holder)
        this.paint()
        return holder
      }
      private paint() {
        this.root?.render(
          <QueryClientProvider client={config.query_client}>
            <I18nProvider locale={config.locale}>
              <div className="grid gap-4">
                {!this.read_only ? (
                  <details open>
                    <summary>{translate(config.locale, 'widgets.settings')}</summary>
                    <WidgetSettings
                      widget={this.widget}
                      onChange={(widget) => {
                        this.widget = widget
                        this.block.dispatchChange()
                        this.paint()
                      }}
                    />
                  </details>
                ) : null}
                <details>
                  <summary>{translate(config.locale, 'widgets.preview')}</summary>
                  <MemoryRouter>
                    <AdminWidgetPreview key={JSON.stringify(this.widget)} widget={this.widget} />
                  </MemoryRouter>
                </details>
              </div>
            </I18nProvider>
          </QueryClientProvider>,
        )
      }
      save() {
        return { ...this.widget.data, widget_id: this.widget.id }
      }
      removed() {
        this.destroy()
      }
      destroy() {
        const root = this.root
        this.root = undefined
        if (root) queueMicrotask(() => root.unmount())
      }
    }
  }
  return {
    adminComments: tool('adminComments'),
    adminFeedback: tool('adminFeedback'),
    adminButtons: tool('adminButtons'),
  }
}
