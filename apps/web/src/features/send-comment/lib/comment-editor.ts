function lengthOf(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent?.length ?? 0
  if (node.nodeName === 'BR') return 1
  let total = 0
  for (const child of node.childNodes) total += lengthOf(child)
  return total
}

function childIndex(parent: Node, child: Node): number {
  return Array.prototype.indexOf.call(parent.childNodes, child) as number
}

/** Текст поля: перевод строки — это `<br>`, а не символ в текстовом узле. */
export function editorText(element: HTMLElement): string {
  let text = ''
  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += (node.textContent ?? '').replace(/\u00a0/g, ' ')
      return
    }
    if (node.nodeName === 'BR') {
      text += '\n'
      return
    }
    for (const child of node.childNodes) visit(child)
  }
  visit(element)
  return text
}

function offsetOf(root: HTMLElement, container: Node, offset: number): number | null {
  if (container !== root && !root.contains(container)) return null
  let count = 0
  const visit = (node: Node): boolean => {
    if (node === container) {
      if (node.nodeType === Node.TEXT_NODE) count += offset
      else {
        const children = node.childNodes
        for (let index = 0; index < offset && index < children.length; index += 1) {
          const child = children[index]
          if (child) count += lengthOf(child)
        }
      }
      return true
    }
    if (node.nodeName === 'BR') {
      count += 1
      return false
    }
    if (node.nodeType === Node.TEXT_NODE) {
      count += node.textContent?.length ?? 0
      return false
    }
    for (const child of node.childNodes) {
      if (visit(child)) return true
    }
    return false
  }
  return visit(root) ? count : null
}

function pointAt(root: HTMLElement, target: number): { node: Node; offset: number } | null {
  let remaining = target
  const visit = (node: Node): { node: Node; offset: number } | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length ?? 0
      if (remaining <= length) return { node, offset: remaining }
      remaining -= length
      return null
    }
    if (node.nodeName === 'BR') {
      const parent = node.parentNode
      if (!parent) return null
      if (remaining === 0) return { node: parent, offset: childIndex(parent, node) }
      remaining -= 1
      if (remaining === 0) return { node: parent, offset: childIndex(parent, node) + 1 }
      return null
    }
    for (const child of node.childNodes) {
      const found = visit(child)
      if (found) return found
    }
    return null
  }
  return visit(root)
}

export function editorSelection(element: HTMLElement | null) {
  const selection = window.getSelection()
  if (!element || !selection?.rangeCount || !selection.anchorNode || !element.contains(selection.anchorNode))
    return null
  const range = selection.getRangeAt(0)
  const start = offsetOf(element, range.startContainer, range.startOffset)
  const end = offsetOf(element, range.endContainer, range.endOffset)
  if (start == null || end == null) return null
  return { start, end: Math.max(start, end) }
}

export function setEditorSelection(element: HTMLElement | null, start: number, end = start) {
  if (!element) return
  element.focus()
  const range = document.createRange()
  const start_point = pointAt(element, start)
  const end_point = pointAt(element, end)
  if (!start_point || !end_point) {
    range.selectNodeContents(element)
    range.collapse(false)
  } else {
    range.setStart(start_point.node, start_point.offset)
    range.setEnd(end_point.node, end_point.offset)
  }
  const selection = window.getSelection()
  selection?.removeAllRanges()
  selection?.addRange(range)
}

/** Кусок текста с переводами строк. Пустая строка на конце даёт `<br>`, чтобы каретка встала на новую строку. */
export function appendEditorText(fragment: DocumentFragment, text: string, mention?: (text: string) => HTMLElement) {
  const lines = text.split('\n')
  lines.forEach((line, index) => {
    if (line) {
      if (mention) fragment.append(mention(line))
      else fragment.append(document.createTextNode(line))
    }
    if (index < lines.length - 1) fragment.append(document.createElement('br'))
  })
}
