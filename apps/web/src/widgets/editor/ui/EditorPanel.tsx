import { BlockRenderer, BaseIcon, Button, CloseButton } from '@/shared/ui'
import type { EditorPanelSlots } from '@/shared/ui'
import { useT } from '@/shared/i18n'

type EditorPanelProps = EditorPanelSlots & {
  is_fullscreen: boolean
  onToggleFullscreen: () => void
  onClose: () => void
}

/** Shared composer chrome. The hidden editor stays mounted while previewing. */
export function EditorPanel({
  header,
  metadata,
  footer,
  children,
  preview,
  is_fullscreen,
  onToggleFullscreen,
  onClose,
}: EditorPanelProps) {
  const { t } = useT()
  return (
    <div className="article-editor-panel flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3 pl-16 pr-5 pt-7 sm:pl-24 sm:pr-8">
        {header}
        <Button
          variant="ghost"
          isIconOnly
          className="ml-auto rounded-full bg-surface-secondary"
          aria-label={t(is_fullscreen ? 'editor.collapse' : 'editor.expand')}
          onPress={onToggleFullscreen}
        >
          {is_fullscreen ? (
            <BaseIcon name="fullscreen_exit_2" style="line" />
          ) : (
            <BaseIcon name="fullscreen_2" style="line" />
          )}
        </Button>
        <CloseButton
          aria-label={t('common.close')}
          className="rounded-full bg-surface-secondary"
          onPress={onClose}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-6 sm:px-8">
        {metadata ? (
          <div className="mb-6 flex flex-col gap-3 pl-11 sm:pl-16">{metadata}</div>
        ) : null}
        <div hidden={Boolean(preview)}>{children}</div>
        {preview ? (
          <article className="pl-11 sm:pl-16">
            <h1 className="article-editor-title">{preview.title}</h1>
            <BlockRenderer blocks={preview.blocks} />
          </article>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-separator pl-16 pr-5 py-4 sm:pl-24 sm:pr-8">
        {footer}
      </div>
    </div>
  )
}
