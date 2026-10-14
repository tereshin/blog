import { useT } from '@/shared/i18n'
import { useBlockEditor } from '../model/useBlockEditor.ts'
import type { BlockEditorOptions } from '../model/useBlockEditor.ts'
import { EditorSkeleton } from './EditorSkeleton.tsx'
import '../styles/editorjs.css'

type BlockEditorProps = BlockEditorOptions

/** Editor.js lifecycle and document operations are owned by the model hook. */
export function BlockEditor(props: BlockEditorProps) {
  const { t } = useT()
  const { holder_ref, phase, handleRetry, handleInput } = useBlockEditor(props)
  return (
    <div className="editor-holder relative min-h-48" data-editor={phase}>
      {phase === 'loading' ? <EditorSkeleton /> : null}
      {phase === 'failed' ? (
        <div>
          <p className="text-sm text-danger">{t('error.unknown')}</p>
          <button
            type="button"
            onClick={handleRetry}
          >
            {t('common.retry')}
          </button>
        </div>
      ) : null}
      <div
        ref={holder_ref}
        onInput={handleInput}
      />
    </div>
  )
}
