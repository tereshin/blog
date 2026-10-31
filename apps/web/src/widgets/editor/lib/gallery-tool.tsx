import type { BlockToolConstructorOptions } from '@editorjs/editorjs'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { galleryDataSchema } from '@blog/contracts'
import type { GalleryData } from '@blog/contracts'
import { I18nProvider } from '@/shared/i18n'
import type { Locale } from '@/shared/i18n'
import { ImageGallery } from '@/shared/ui'
import { GalleryEditor } from '../ui/GalleryEditor.tsx'

type GalleryConfig = { locale: Locale }

export class GalleryTool {
  static get isReadOnlySupported() { return true }
  static get enableLineBreaks() { return true }
  static get toolbox() {
    return { title: 'Gallery', icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="1" y="3" width="12" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M16 3v14m3-14v14M2 13l4-4 6 6" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="7" r="1.5" fill="currentColor"/></svg>' }
  }

  private data: GalleryData
  private root: Root | null = null
  private readonly options: BlockToolConstructorOptions<Partial<GalleryData>, GalleryConfig>

  constructor(options: BlockToolConstructorOptions<Partial<GalleryData>, GalleryConfig>) {
    this.options = options
    const parsed = galleryDataSchema.safeParse(options.data)
    this.data = parsed.success ? parsed.data : { items: [], caption: '' }
  }

  render() {
    const holder = document.createElement('div')
    this.root = createRoot(holder)
    this.root.render(
      <I18nProvider locale={this.options.config?.locale}>
        {this.options.readOnly ? <ImageGallery {...this.data} /> :
          <GalleryEditor initial={this.data} onChange={(data) => { this.data = data; this.options.block.dispatchChange() }} />}
      </I18nProvider>,
    )
    return holder
  }

  save(): GalleryData { return this.data }
  validate(data: GalleryData): boolean { return data.items.length > 0 }
  destroy() {
    const root = this.root
    this.root = null
    // Editor.js can be destroyed during the parent React tree's cleanup.
    queueMicrotask(() => root?.unmount())
  }
}
