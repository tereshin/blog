import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { BlocksDocument } from '@blog/contracts'
import type EditorJS from '@editorjs/editorjs'
import type { OutputData } from '@editorjs/editorjs'
import { useT } from '@/shared/i18n'
import { TitleTool } from '../lib/title-tool.ts'
import { loadEditor } from '../lib/load-editor.ts'
import { parseEditorOutput } from '../lib/normalize-document.ts'
import type { BlockEditorHandle } from '../model/useEditorDocument.ts'
import { EditorSkeleton } from './EditorSkeleton.tsx'
import '../styles/editorjs.css'

type BlockEditorProps = {
  initial: BlocksDocument | null
  title: string
  title_placeholder: string
  onTitleChange: (title: string) => void
  placeholder: string
  handle_ref: RefObject<BlockEditorHandle | null>
  onDirty: () => void
  onReady: () => void
}

/**
 * Редактор блоков. Сам Editor.js и инструменты грузятся динамически после монтирования,
 * чтобы не попасть в серверный граф и не инициализироваться до появления документа.
 */
export function BlockEditor({
  initial,
  title,
  title_placeholder,
  onTitleChange,
  placeholder,
  handle_ref,
  onDirty,
  onReady,
}: BlockEditorProps) {
  const { t } = useT()
  const holder_ref = useRef<HTMLDivElement>(null)
  const editor_ref = useRef<EditorJS | null>(null)
  const ready_ref = useRef(false)
  const saved_blocks = useRef<string | null>(null)
  const on_dirty = useRef(onDirty)
  const on_ready = useRef(onReady)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    on_dirty.current = onDirty
    on_ready.current = onReady
  }, [onDirty, onReady])

  useImperativeHandle(handle_ref, () => ({
    async save() {
      const editor = editor_ref.current
      if (!editor) throw new Error('Редактор ещё не готов')
      const output = await editor.save()
      saved_blocks.current = JSON.stringify(output.blocks)
      return parseEditorOutput({
        ...output,
        blocks: output.blocks.filter((block) => block.type !== 'title'),
      })
    },
  }))

  useEffect(() => {
    const holder = holder_ref.current
    if (!holder) return
    let cancelled = false
    ready_ref.current = false

    void (async () => {
      try {
        const { Editor, tools } = await loadEditor()
        if (cancelled) return
        const editor = new Editor({
          holder,
          tools: {
            ...tools,
            title: {
              class: TitleTool,
              config: { placeholder: title_placeholder, onChange: onTitleChange },
            },
          },
          placeholder,
          // Документ контракта совпадает с OutputData, но разделитель может прийти без data.
          data: {
            blocks: [
              { type: 'title', data: { text: title } },
              ...(initial?.blocks.length
                ? initial.blocks
                : [{ type: 'paragraph', data: { text: '' } }]),
            ],
          } as OutputData,
          inlineToolbar: ['bold', 'italic', 'link', 'inlineCode', 'marker', 'underline'],
          minHeight: 80,
          onChange: async () => {
            if (!ready_ref.current) return
            // Editor.js debounces changes: a pre-save event can arrive after saving.
            try {
              const output = await editor.save()
              const title_block = output.blocks.find((block) => block.type === 'title')
              onTitleChange(typeof title_block?.data['text'] === 'string' ? title_block.data['text'] : '')
              if (JSON.stringify(output.blocks) !== saved_blocks.current) on_dirty.current()
            } catch {
              on_dirty.current()
            }
          },
        })
        await editor.isReady
        if (cancelled) {
          editor.destroy()
          return
        }
        editor_ref.current = editor
        ready_ref.current = true
        setPhase('ready')
        on_ready.current()
      } catch {
        if (!cancelled) setPhase('failed')
      }
    })()

    return () => {
      cancelled = true
      ready_ref.current = false
      const editor = editor_ref.current
      editor_ref.current = null
      try {
        editor?.destroy()
      } catch {
        // Повторный destroy на уже снятом экземпляре Editor.js бросает исключение.
      }
    }
    // Начальные блоки читаются один раз: повторный эффект уничтожил бы несохранённый текст.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeholder])

  return (
    <div className="editor-holder relative min-h-48" data-editor={phase}>
      {phase === 'loading' ? <EditorSkeleton /> : null}
      {phase === 'failed' ? <p className="text-sm text-danger">{t('error.unknown')}</p> : null}
      <div ref={holder_ref} />
    </div>
  )
}
