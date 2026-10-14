import type { Meta, StoryObj } from '@storybook/react-vite'
import { StoryProviders } from '@/shared/api/mocks'
import { AttachmentCard } from './AttachmentCard.tsx'

const meta = {
  title: 'shared/AttachmentCard', component: AttachmentCard,
  decorators: [(Story) => <StoryProviders><Story /></StoryProviders>],
  args: { href: 'https://example.com/file', title: 'Report.pdf', extension: 'pdf', size: 248320 },
} satisfies Meta<typeof AttachmentCard>
export default meta
type Story = StoryObj<typeof meta>
export const Pdf: Story = {}
export const Document: Story = { args: { extension: 'docx', title: 'Document.docx' } }
export const Spreadsheet: Story = { args: { extension: 'xlsx', title: 'Table.xlsx' } }
export const Image: Story = { args: { extension: 'png', title: 'Image.png' } }
export const Unknown: Story = { args: { extension: null, size: null, title: '' } }
export const LongTitle: Story = { args: { title: 'A very long attachment title that must remain contained within its card and keep the download icon visible.pdf' } }
