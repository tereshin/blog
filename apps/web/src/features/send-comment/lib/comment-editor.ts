export function editorSelection(element: HTMLElement | null) {
  const selection = window.getSelection()
  if (!element || !selection?.rangeCount || !element.contains(selection.anchorNode)) return null
  const range = selection.getRangeAt(0)
  const before = range.cloneRange()
  before.selectNodeContents(element)
  before.setEnd(range.startContainer, range.startOffset)
  const start = before.toString().length
  return { start, end: start + range.toString().length }
}

export function setEditorSelection(element: HTMLElement | null, start: number, end = start) {
  if (!element) return
  element.focus()
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  let offset = 0
  let has_start = false
  while (walker.nextNode()) {
    const node = walker.currentNode
    const length = node.textContent?.length ?? 0
    if (!has_start && start <= offset + length) {
      range.setStart(node, Math.max(0, start - offset))
      has_start = true
    }
    if (has_start && end <= offset + length) {
      range.setEnd(node, Math.max(0, end - offset))
      window.getSelection()?.removeAllRanges()
      window.getSelection()?.addRange(range)
      return
    }
    offset += length
  }
  range.selectNodeContents(element)
  range.collapse(false)
  window.getSelection()?.removeAllRanges()
  window.getSelection()?.addRange(range)
}
