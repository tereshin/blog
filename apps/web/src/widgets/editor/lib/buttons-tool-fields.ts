/** Поля формы внутри блока. Клавиши не доходят до Editor.js: иначе Enter и Backspace делят и склеивают блоки. */
function isolate(control: HTMLElement): void {
  control.addEventListener('keydown', (event) => {
    event.stopPropagation()
    if (event.key === 'Enter' && control instanceof HTMLInputElement) event.preventDefault()
  })
  control.addEventListener('paste', (event) => event.stopPropagation())
}

export function textInput(class_name: string, label: string, max_length: number, type: 'text' | 'url'): HTMLInputElement {
  const input = document.createElement('input')
  input.type = type
  input.className = `buttons-tool__input ${class_name}`
  input.placeholder = label
  input.maxLength = max_length
  input.setAttribute('aria-label', label)
  if (type === 'url') input.inputMode = 'url'
  isolate(input)
  return input
}

export function selectInput<T extends string>(
  class_name: string,
  label: string,
  options: readonly T[],
  labels: Record<T, string>,
): HTMLSelectElement {
  const select = document.createElement('select')
  select.className = `buttons-tool__select ${class_name}`
  select.setAttribute('aria-label', label)
  select.title = label
  for (const value of options) {
    const option = document.createElement('option')
    option.value = value
    option.textContent = labels[value]
    select.append(option)
  }
  isolate(select)
  return select
}

export function actionButton(class_name: string, label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `buttons-tool__action ${class_name}`
  button.textContent = label
  button.addEventListener('click', onClick)
  return button
}

export function pickFile(accept: string): Promise<File | null> {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = accept
  return new Promise<File | null>((resolve) => {
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null), { once: true })
    input.addEventListener('cancel', () => resolve(null), { once: true })
    input.click()
  })
}
