import type { EditorConfig } from '@editorjs/editorjs'
import type EditorJS from '@editorjs/editorjs'
import { uploadEditorFile } from './editor-uploader.ts'

type EditorTools = NonNullable<EditorConfig['tools']>

/** Инструменты подгружаются только в браузере: пакеты Editor.js трогают `window` при импорте. */
export async function loadEditor(): Promise<{ Editor: typeof EditorJS; tools: EditorTools }> {
  const [editor_module, header, list, quote, warning, delimiter, code, inline_code, marker, underline, image, attaches, embed, table, personality] =
    await Promise.all([
      import('@editorjs/editorjs'),
      import('@editorjs/header'),
      import('@editorjs/list'),
      import('@editorjs/quote'),
      import('@editorjs/warning'),
      import('@editorjs/delimiter'),
      import('@editorjs/code'),
      import('@editorjs/inline-code'),
      import('@editorjs/marker'),
      import('@editorjs/underline'),
      import('@editorjs/image'),
      import('@editorjs/attaches'),
      import('@editorjs/embed'),
      import('@editorjs/table'),
      import('@editorjs/personality'),
    ])

  const tools: EditorTools = {
    header: { class: header.default, inlineToolbar: true, config: { levels: [2, 3, 4], defaultLevel: 2 } },
    list: { class: list.default, inlineToolbar: true },
    quote: { class: quote.default, inlineToolbar: true },
    warning: { class: warning.default, inlineToolbar: true },
    delimiter: delimiter.default,
    code: code.default,
    inlineCode: inline_code.default,
    marker: marker.default,
    underline: underline.default,
    image: { class: image.default, config: { uploader: { uploadByFile: (file: File) => uploadEditorFile(file, 'image') } } },
    attaches: { class: attaches.default, config: { uploader: { uploadByFile: (file: File) => uploadEditorFile(file, 'attachment') } } },
    embed: { class: embed.default, config: { services: { youtube: true, vimeo: true, twitter: true, github: true, codepen: true } } },
    table: table.default,
    personality: personality.default,
  }

  return { Editor: editor_module.default, tools }
}
