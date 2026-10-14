import type { Meta, StoryObj } from '@storybook/react-vite'
import type { DocumentBlock } from './document-block.ts'
import { BlockRenderer } from './BlockRenderer.tsx'

const blocks: Record<string, DocumentBlock> = {
  paragraph: {
    type: 'paragraph',
    data: { text: 'Абзац с <b>жирным</b> и <a href="https://example.com">ссылкой</a>.' },
  },
  header: { type: 'header', data: { text: 'Заголовок', level: 2 } },
  list: {
    type: 'list',
    data: {
      style: 'checklist',
      items: [
        { content: 'Готово', meta: { checked: true } },
        { content: 'Впереди', items: ['вложенный'] },
      ],
    },
  },
  quote: { type: 'quote', data: { text: 'Цитата', caption: 'Кто-то' } },
  warning: { type: 'warning', data: { title: 'Внимание', message: 'Проверьте данные' } },
  delimiter: { type: 'delimiter', data: {} },
  code: { type: 'code', data: { code: 'const n = 1' } },
  image: {
    type: 'image',
    data: { file: { url: 'https://example.com/pic.png' }, caption: 'Рисунок' },
  },
  embed: {
    type: 'embed',
    data: {
      service: 'youtube',
      source: 'https://youtu.be/x',
      embed: 'https://www.youtube.com/embed/x',
      width: 640,
      height: 360,
    },
  },
  table: {
    type: 'table',
    data: {
      withHeadings: true,
      content: [
        ['Имя', 'Роль'],
        ['Анна', 'Автор'],
      ],
    },
  },
  attaches: {
    type: 'attaches',
    data: {
      file: { url: 'https://example.com/report.pdf', size: 248_320, extension: 'pdf' },
      title: 'Отчёт за октябрь.pdf',
    },
  },
  personality: {
    type: 'personality',
    data: { name: 'Анна', position: 'Редактор', photo: 'https://example.com/anna.png' },
  },
  buttons: {
    type: 'buttons',
    data: {
      items: [
        {
          text: 'Скачать',
          url: 'https://example.com/download',
          size: 'lg',
          variant: 'primary',
          icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/></svg>',
        },
        { text: 'Подробнее', url: 'https://example.com', size: 'lg', variant: 'outline' },
        { text: 'Удалить', url: 'https://example.com/delete', size: 'sm', variant: 'danger-soft' },
      ],
    },
  },
}

function Frame({ kind }: { kind: keyof typeof blocks }) {
  const block = blocks[kind]
  return (
    <div className="max-w-xl p-4">
      <BlockRenderer blocks={block ? [block] : []} />
    </div>
  )
}

const meta = { title: 'shared/ui/BlockRenderer', component: Frame } satisfies Meta<typeof Frame>
export default meta
type Story = StoryObj<typeof Frame>

export const Paragraph: Story = { args: { kind: 'paragraph' } }
export const Header: Story = { args: { kind: 'header' } }
export const List: Story = { args: { kind: 'list' } }
export const Quote: Story = { args: { kind: 'quote' } }
export const Warning: Story = { args: { kind: 'warning' } }
export const Delimiter: Story = { args: { kind: 'delimiter' } }
export const Code: Story = { args: { kind: 'code' } }
export const Image: Story = { args: { kind: 'image' } }
export const Embed: Story = { args: { kind: 'embed' } }
export const Table: Story = { args: { kind: 'table' } }
export const Attaches: Story = { args: { kind: 'attaches' } }
export const Personality: Story = { args: { kind: 'personality' } }
export const Buttons: Story = { args: { kind: 'buttons' } }
