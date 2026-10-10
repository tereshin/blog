import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './Button.tsx'
import { IdentityHeader } from './IdentityHeader.tsx'
import { Tabs } from './Tabs.tsx'

const meta = { title: 'shared/ui/IdentityHeader', component: IdentityHeader } satisfies Meta<
  typeof IdentityHeader
>
export default meta
type Story = StoryObj

export const Default: Story = {
  render: () => (
    <div className="max-w-2xl">
      <Tabs variant="secondary" defaultSelectedKey="posts">
        <IdentityHeader>
          <IdentityHeader.Cover />
          <IdentityHeader.Identity
            avatar={<IdentityHeader.Avatar name="Анна Авторова" />}
            actions={<Button>Подписаться</Button>}
          />
          <IdentityHeader.Content>
            <h1 className="text-2xl font-semibold">Анна Авторова</h1>
            <p className="text-sm text-muted">с 2020</p>
            <p className="text-[15px] leading-6">Пишет о технологиях и делится опытом.</p>
          </IdentityHeader.Content>
          <IdentityHeader.Navigation>
            <Tabs.List aria-label="Материалы">
              <Tabs.Tab id="posts">Посты</Tabs.Tab>
              <Tabs.Tab id="comments">Комментарии</Tabs.Tab>
            </Tabs.List>
          </IdentityHeader.Navigation>
        </IdentityHeader>
        <Tabs.Panel id="posts">Посты автора</Tabs.Panel>
        <Tabs.Panel id="comments">Комментарии автора</Tabs.Panel>
      </Tabs>
    </div>
  ),
}
export const Loading: Story = { render: () => <IdentityHeader.Skeleton /> }
export const CoverAndAvatar: Story = {
  render: () => (
    <IdentityHeader>
      <IdentityHeader.Cover url="/badges/one_year.svg" action={<Button>Изменить обложку</Button>} />
      <IdentityHeader.Identity
        avatar={<IdentityHeader.Avatar src="/badges/first_post.svg" name="Дизайн" />}
      />
      <IdentityHeader.Content>
        <h1 className="text-2xl font-semibold">Дизайн</h1>
      </IdentityHeader.Content>
    </IdentityHeader>
  ),
}
