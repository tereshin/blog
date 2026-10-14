import preview from '#.storybook/preview'
import { DataTable } from './DataTable.tsx'

const items = [
  { id: '1', name: 'Anna' },
  { id: '2', name: 'Boris' },
]

function Frame() {
  return (
    <div className="p-4">
      <DataTable
        label="Members"
        items={items}
        getKey={(item) => item.id}
        empty={<p>Empty</p>}
        columns={[
          { id: 'name', label: 'Name', render: (item) => item.name },
        ]}
      />
    </div>
  )
}

const meta = preview.meta({ title: 'shared/ui/DataTable', component: Frame })
export const Default = meta.story({})
