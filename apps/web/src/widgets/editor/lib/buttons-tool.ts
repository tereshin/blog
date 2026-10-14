import type { API, BlockAPI, BlockToolConstructorOptions } from '@editorjs/editorjs'
import { buttonVariants } from '@heroui/react/button'
import { BLOCK_BUTTON_SIZES, BLOCK_BUTTON_TEXT_MAX, BLOCK_BUTTON_URL_MAX, BLOCK_BUTTON_VARIANTS, MAX_BLOCK_BUTTONS, isHttpUrl, navIconSvgSchema } from '@blog/contracts'
import type { BlockButton } from '@blog/contracts'
import { mountSvgIcon } from '@/shared/lib/svg-icon'
import { actionButton, pickFile, selectInput, textInput } from './buttons-tool-fields.ts'
import { FALLBACK, TOOLBOX_ICON, draftOf, emptyDraft, oneOf } from './buttons-tool-draft.ts'
import type { ButtonsData, DraftButton, ButtonsConfig } from './buttons-tool-draft.ts'

export type { ButtonsConfig, ButtonsData } from './buttons-tool-draft.ts'

/** Кнопки-ссылки HeroUI: текст, внешний http(s)-адрес, размер, вариация и проверенная SVG-иконка. */
export class ButtonsTool {
  static get isReadOnlySupported() {
    return true
  }

  static get enableLineBreaks() {
    return true
  }

  static get toolbox() {
    return { title: 'Buttons', icon: TOOLBOX_ICON }
  }

  private readonly api: API
  private readonly block: BlockAPI
  private readonly read_only: boolean
  private readonly labels: ButtonsConfig
  private readonly root: HTMLDivElement
  private readonly row: HTMLDivElement
  private readonly text_input: HTMLInputElement
  private readonly url_input: HTMLInputElement
  private readonly size_select: HTMLSelectElement
  private readonly variant_select: HTMLSelectElement
  private readonly icon_add: HTMLButtonElement
  private readonly icon_remove: HTMLButtonElement
  private readonly remove_button: HTMLButtonElement
  private readonly add_button: HTMLButtonElement
  private items: DraftButton[]
  private selected = 0

  constructor({ data, api, block, config, readOnly }: BlockToolConstructorOptions<Partial<ButtonsData>, Partial<ButtonsConfig>>) {
    this.api = api
    this.block = block
    this.read_only = readOnly
    this.labels = { ...FALLBACK, ...config }
    const items = Array.isArray(data.items) ? data.items.slice(0, MAX_BLOCK_BUTTONS).map(draftOf) : []
    this.items = items.length ? items : [emptyDraft()]
    this.root = document.createElement('div')
    this.root.className = 'buttons-tool'
    this.row = document.createElement('div')
    this.row.className = 'buttons-tool__row'
    const l = this.labels
    this.text_input = textInput('buttons-tool__text', l.text_placeholder, BLOCK_BUTTON_TEXT_MAX, 'text')
    this.url_input = textInput('buttons-tool__url', l.url_label, BLOCK_BUTTON_URL_MAX, 'url')
    this.url_input.placeholder = l.url_placeholder
    this.add_button = actionButton('buttons-tool__add', '+', () => this.addButton())
    this.add_button.setAttribute('aria-label', l.add_label)
    this.add_button.title = l.add_label
    this.size_select = selectInput('buttons-tool__size', l.size_label, BLOCK_BUTTON_SIZES, l.sizes)
    this.variant_select = selectInput('buttons-tool__variant', l.variant_label, BLOCK_BUTTON_VARIANTS, l.variants)
    this.icon_add = actionButton('buttons-tool__icon', l.icon_add, () => void this.pickIcon())
    this.icon_remove = actionButton('buttons-tool__icon-remove', l.icon_remove, () => this.update({ icon: undefined }))
    this.remove_button = actionButton('buttons-tool__remove', l.remove_label, () => this.removeSelected())
    this.root.append(this.row)
    if (!readOnly) this.root.append(this.panel())
    this.paint()
  }

  private panel(): HTMLDivElement {
    const panel = document.createElement('div')
    panel.className = 'buttons-tool__panel'
    this.text_input.addEventListener('input', () => this.update({ text: this.text_input.value }))
    this.url_input.addEventListener('input', () => this.update({ url: this.url_input.value }))
    this.size_select.addEventListener('change', () =>
      this.update({ size: oneOf(BLOCK_BUTTON_SIZES, this.size_select.value, 'md') }),
    )
    this.variant_select.addEventListener('change', () =>
      this.update({ variant: oneOf(BLOCK_BUTTON_VARIANTS, this.variant_select.value, 'primary') }),
    )
    panel.append(
      this.text_input,
      this.url_input,
      this.size_select,
      this.variant_select,
      this.icon_add,
      this.icon_remove,
      this.remove_button,
    )
    return panel
  }

  private update(patch: Partial<DraftButton>): void {
    const current = this.items[this.selected]
    if (!current) return
    const next = { ...current, ...patch }
    if (!next.icon) delete next.icon
    this.items = this.items.map((item, index) => (index === this.selected ? next : item))
    this.paint()
    this.block.dispatchChange()
  }

  private select(index: number): void {
    this.selected = index
    this.paint()
    this.text_input.focus()
  }

  private addButton(): void {
    if (this.items.length >= MAX_BLOCK_BUTTONS) return
    const last = this.items.at(-1)
    this.items = [...this.items, { ...emptyDraft(), ...(last ? { size: last.size } : {}) }]
    this.select(this.items.length - 1)
    this.block.dispatchChange()
  }

  private removeSelected(): void {
    if (this.items.length <= 1) return
    this.items = this.items.filter((_item, index) => index !== this.selected)
    this.selected = Math.min(this.selected, this.items.length - 1)
    this.paint()
    this.block.dispatchChange()
  }

  private async pickIcon(): Promise<void> {
    const file = await pickFile('.svg,image/svg+xml')
    if (!file) return
    const parsed =
      file.type && file.type !== 'image/svg+xml' ? null : navIconSvgSchema.safeParse(await file.text())
    if (!parsed?.success) {
      this.api.notifier.show({ message: this.labels.icon_invalid, style: 'error' })
      return
    }
    this.update({ icon: parsed.data })
  }

  private preview(item: DraftButton, index: number): HTMLElement {
    const node = document.createElement(this.read_only ? 'span' : 'button')
    node.className = `${buttonVariants({ size: item.size, variant: item.variant })} buttons-tool__preview`
    if (node instanceof HTMLButtonElement) {
      node.type = 'button'
      node.setAttribute('aria-pressed', String(index === this.selected))
      node.addEventListener('click', () => this.select(index))
    }
    if (item.icon) {
      const icon = document.createElement('span')
      icon.className = `buttons-tool__glyph buttons-tool__glyph--${item.size}`
      icon.setAttribute('aria-hidden', 'true')
      mountSvgIcon(icon, item.icon)
      node.append(icon)
    }
    const label = document.createElement('span')
    const text = item.text.trim()
    label.textContent = text || this.labels.text_placeholder
    if (!text) label.className = 'buttons-tool__placeholder'
    node.append(label)
    return node
  }

  private paint(): void {
    this.row.replaceChildren(...this.items.map((item, index) => this.preview(item, index)))
    if (this.read_only) return
    this.add_button.disabled = this.items.length >= MAX_BLOCK_BUTTONS
    this.row.append(this.add_button)
    const current = this.items[this.selected] ?? emptyDraft()
    if (this.text_input.value !== current.text) this.text_input.value = current.text
    if (this.url_input.value !== current.url) this.url_input.value = current.url
    const url = current.url.trim()
    this.url_input.setAttribute('aria-invalid', String(Boolean(url) && !isHttpUrl(url)))
    this.size_select.value = current.size
    this.variant_select.value = current.variant
    this.icon_remove.hidden = !current.icon
    this.remove_button.disabled = this.items.length <= 1
  }

  render() {
    return this.root
  }

  /** Незаполненные кнопки и адреса не по http(s) в документ не попадают. */
  save(): ButtonsData {
    const items = this.items.flatMap((item): BlockButton[] => {
      const text = item.text.trim()
      const url = item.url.trim()
      if (!text || !isHttpUrl(url)) return []
      return [{ text, url, size: item.size, variant: item.variant, ...(item.icon ? { icon: item.icon } : {}) }]
    })
    return { items }
  }

  validate(data: ButtonsData): boolean {
    return data.items.length > 0
  }
}
