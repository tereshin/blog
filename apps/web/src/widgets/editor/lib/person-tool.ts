import type { API, BlockAPI, BlockToolConstructorOptions } from '@editorjs/editorjs'

export type PersonData = {
  name: string
  position?: string
  photo?: string
}

type PersonConfig = {
  name_placeholder: string
  position_placeholder: string
  photo_label: string
  upload_by_file: (file: File) => Promise<{ file: { url: string } }>
}

const TOOLBOX_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="3.2"/><path d="M5 19.2c1.2-3.2 3.6-4.8 7-4.8s5.8 1.6 7 4.8"/></svg>'

function httpUrl(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

function personMark(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  svg.classList.add('person-tool__mark')
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  circle.setAttribute('cx', '12')
  circle.setAttribute('cy', '8')
  circle.setAttribute('r', '3.2')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'M5 19.2c1.2-3.2 3.6-4.8 7-4.8s5.8 1.6 7 4.8')
  svg.append(circle, path)
  return svg
}

/** Карточка человека: аватар, имя и должность. В документ попадает только текст и http(s)-адрес фото. */
export class PersonTool {
  static get isReadOnlySupported() {
    return true
  }

  static get toolbox() {
    return { title: 'Person', icon: TOOLBOX_ICON }
  }

  static get sanitize() {
    return { name: {}, position: {}, photo: {} }
  }

  private readonly api: API
  private readonly block: BlockAPI
  private readonly read_only: boolean
  private readonly upload_by_file: PersonConfig['upload_by_file'] | undefined
  private readonly root: HTMLDivElement
  private readonly photo_button: HTMLButtonElement
  private readonly name_el: HTMLDivElement
  private readonly position_el: HTMLDivElement
  private photo_url: string

  constructor({
    data,
    api,
    block,
    config,
    readOnly,
  }: BlockToolConstructorOptions<PersonData, PersonConfig>) {
    this.api = api
    this.block = block
    this.read_only = readOnly
    this.upload_by_file = config?.upload_by_file
    this.photo_url = httpUrl(data.photo) ?? ''
    this.root = document.createElement('div')
    this.root.className = 'person-tool'
    this.photo_button = document.createElement('button')
    this.photo_button.type = 'button'
    this.photo_button.className = 'person-tool__photo'
    this.photo_button.disabled = readOnly
    this.photo_button.setAttribute('aria-label', config?.photo_label ?? '')
    if (!readOnly) this.photo_button.addEventListener('click', () => void this.pickPhoto())
    this.paintPhoto()
    this.name_el = this.textField('person-tool__name', data.name ?? '', config?.name_placeholder ?? '')
    this.position_el = this.textField(
      'person-tool__position',
      data.position ?? '',
      config?.position_placeholder ?? '',
    )
    this.root.append(this.photo_button, this.name_el, this.position_el)
  }

  private textField(class_name: string, text: string, placeholder: string): HTMLDivElement {
    const field = document.createElement('div')
    field.className = class_name
    field.contentEditable = String(!this.read_only)
    field.dataset['placeholder'] = placeholder
    field.setAttribute('role', 'textbox')
    field.setAttribute('aria-label', placeholder)
    field.textContent = text
    field.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') event.preventDefault()
    })
    field.addEventListener('input', () => {
      if ((field.textContent ?? '').length === 0) field.replaceChildren()
    })
    field.addEventListener('paste', (event) => {
      event.preventDefault()
      const pasted = event.clipboardData?.getData('text/plain') ?? ''
      if (!pasted) return
      const selection = window.getSelection()
      if (!selection?.rangeCount) {
        field.append(document.createTextNode(pasted))
        return
      }
      selection.deleteFromDocument()
      selection.getRangeAt(0).insertNode(document.createTextNode(pasted))
    })
    return field
  }

  private paintPhoto(): void {
    this.photo_button.replaceChildren()
    const src = httpUrl(this.photo_url)
    if (!src) {
      this.photo_button.append(personMark())
      return
    }
    const image = document.createElement('img')
    image.src = src
    image.alt = ''
    this.photo_button.append(image)
  }

  private async pickPhoto(): Promise<void> {
    const upload = this.upload_by_file
    if (!upload) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    const file = await new Promise<File | null>((resolve) => {
      input.addEventListener('change', () => resolve(input.files?.[0] ?? null), { once: true })
      input.addEventListener('cancel', () => resolve(null), { once: true })
      input.click()
    })
    if (!file) return
    this.photo_button.classList.add('person-tool__photo--loading')
    this.photo_button.disabled = true
    try {
      const uploaded = await upload(file)
      const url = httpUrl(uploaded.file.url)
      if (!url) throw new Error('Не удалось загрузить файл')
      this.photo_url = url
      this.paintPhoto()
      this.block.dispatchChange()
    } catch (error) {
      const message = error instanceof Error && error.message ? error.message : 'Не удалось загрузить файл'
      this.api.notifier.show({ message, style: 'error' })
    } finally {
      this.photo_button.classList.remove('person-tool__photo--loading')
      this.photo_button.disabled = this.read_only
    }
  }

  render() {
    return this.root
  }

  save(): PersonData {
    const name = this.name_el.textContent ?? ''
    const position = (this.position_el.textContent ?? '').trim()
    const photo = httpUrl(this.photo_url)
    return {
      name,
      ...(position ? { position } : {}),
      ...(photo ? { photo } : {}),
    }
  }

  validate(data: PersonData): boolean {
    return Boolean(data.name.trim() || data.position?.trim() || httpUrl(data.photo))
  }
}
