import preview from '#.storybook/preview'
import { StoryProviders } from '@/shared/lib'
import { AttachmentCard } from './AttachmentCard.tsx'

const meta = preview.meta({
  title: 'shared/AttachmentCard', component: AttachmentCard,
  decorators: [(Story) => <StoryProviders><Story /></StoryProviders>],
  args: { href: 'https://example.com/file', title: 'Report.pdf', extension: 'pdf', size: 248320 },
})
export const Pdf = meta.story()
export const Document = meta.story({ args: { extension: 'docx', title: 'Document.docx' } })
export const Spreadsheet = meta.story({ args: { extension: 'xlsx', title: 'Table.xlsx' } })
export const Image = meta.story({ args: { extension: 'png', title: 'Image.png' } })
export const Unknown = meta.story({ args: { extension: null, size: null, title: '' } })
export const LongTitle = meta.story({ args: { title: 'A very long attachment title that must remain contained within its card and keep the download icon visible.pdf' } })
