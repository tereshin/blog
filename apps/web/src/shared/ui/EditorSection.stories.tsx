import preview from '#.storybook/preview'
import { useState } from 'react'
import { EditorSection } from './EditorSection.tsx'
import { EditorActions } from './EditorActions.tsx'
import { EditorSaveBar } from './EditorSaveBar.tsx'
import { SortableList, SortableRow } from './SortableList.tsx'
import { SvgIconField } from './SvgIconField.tsx'

function Example() {
  const [icon, setIcon] = useState<string | null>(null)
  const [ids, setIds] = useState(['first', 'second'])
  return (
    <div className="grid max-w-xl gap-3">
      <SortableList ids={ids} onMove={() => setIds([...ids].reverse())}>
        {ids.map((id) => (
          <SortableRow key={id} id={id} label={id}>
            <EditorSection
              id={id}
              title={id}
              count={1}
              actions={<EditorActions label={id} onEdit={() => {}} onDelete={() => {}} />}
            >
              <SvgIconField value={icon} onChange={setIcon} />
            </EditorSection>
          </SortableRow>
        ))}
      </SortableList>
      <EditorSaveBar is_dirty is_pending={false} onSave={() => {}} onCancel={() => {}} />
    </div>
  )
}
const meta = preview.meta({ title: 'shared/EditorSection', component: Example })
export const Default = meta.story({})
