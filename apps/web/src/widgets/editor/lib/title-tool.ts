import type { BlockToolConstructorOptions } from '@editorjs/editorjs'

type TitleConfig = { placeholder: string; onChange: (title: string) => void }

/** Title is edited as a block, but persisted in the article's title field. */
export class TitleTool {
  static get isReadOnlySupported() {
    return true
  }
  private element: HTMLHeadingElement

  constructor({
    data,
    config,
    readOnly,
  }: BlockToolConstructorOptions<{ text: string }, TitleConfig>) {
    this.element = document.createElement('h1')
    this.element.className = 'article-editor-title'
    this.element.contentEditable = String(!readOnly)
    this.element.setAttribute('role', 'textbox')
    this.element.setAttribute('aria-label', config?.placeholder ?? '')
    this.element.dataset['placeholder'] = config?.placeholder ?? ''
    this.element.textContent = data.text ?? ''
    this.element.addEventListener('input', () => config?.onChange(this.element.textContent ?? ''))
    this.element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') event.preventDefault()
    })
  }

  render() {
    return this.element
  }
  save() {
    return { text: this.element.textContent ?? '' }
  }
}
