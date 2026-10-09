/* eslint-disable no-restricted-exports, no-restricted-syntax -- объявления чужих пакетов Editor.js, у них default export. */
declare module '@editorjs/marker' {
  import type { ToolConstructable } from '@editorjs/editorjs'
  const tool: ToolConstructable
  export default tool
}

declare module '@editorjs/attaches' {
  import type { ToolConstructable } from '@editorjs/editorjs'
  const tool: ToolConstructable
  export default tool
}

declare module '@editorjs/personality' {
  import type { ToolConstructable } from '@editorjs/editorjs'
  const tool: ToolConstructable
  export default tool
}

declare module '@editorjs/embed' {
  import type { ToolConstructable } from '@editorjs/editorjs'
  const tool: ToolConstructable
  export default tool
}
