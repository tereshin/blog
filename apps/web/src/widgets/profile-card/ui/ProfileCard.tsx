import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { badgeCatalog, formatReputation } from '@/entities/profile'
import type { Profile, ProfileBadge } from '@/entities/profile'
import { useT } from '@/shared/i18n'
import { Avatar, Button, Card, Skeleton, Tabs, Tooltip } from '@/shared/ui'

type CoverProps = { url: string | null; is_own: boolean; action?: ReactNode }

function Cover({ url, is_own, action }: CoverProps) {
  return (
    <div className="group relative h-40 w-full bg-surface-tertiary">
      {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : null}
      {is_own && action ? (
        <div className={url ? 'absolute inset-0 hidden items-center justify-center group-focus-within:flex group-hover:flex' : 'flex h-full items-center justify-center'}>
          {action}
        </div>
      ) : null}
    </div>
  )
}

function AvatarBlock({ profile }: { profile: Profile }) {
  return (
    <div className="-mt-12 w-fit rounded-avatar ring-4 ring-background">
      <Avatar src={profile.avatar_url} name={profile.display_name} size="lg" />
    </div>
  )
}

function Actions({ children }: { children?: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>
}

function Name({ profile, aside }: { profile: Profile; aside?: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <h1 className="truncate text-xl font-semibold">{profile.display_name}</h1>
      {aside}
    </div>
  )
}

function Reputation({ profile }: { profile: Profile }) {
  const { t } = useT()
  const year = new Date(profile.created_at).getUTCFullYear()
  return (
    <p className="flex items-center gap-2 text-sm">
      <span className="font-medium text-positive">{formatReputation(profile.reputation)}</span>
      <span className="text-muted">{t('profile.since', { year })}</span>
    </p>
  )
}

function Bio({ profile }: { profile: Profile }) {
  if (!profile.bio) return null
  return <p className="whitespace-pre-wrap text-sm">{profile.bio}</p>
}

function Counts({ profile, address }: { profile: Profile; address: string }) {
  const { t } = useT()
  return (
    <p className="flex flex-wrap gap-3 text-sm">
      <Link to={`/u/${address}/followers`} className="outline-offset-2 hover:underline">
        {t('profile.followers', { count: profile.followers_count })}
      </Link>
      <Link to={`/u/${address}/following`} className="outline-offset-2 hover:underline">
        {t('profile.following', { count: profile.following_count })}
      </Link>
    </p>
  )
}

function Badges({ badges }: { badges: ProfileBadge[] }) {
  const { t } = useT()
  if (badges.length === 0) return null
  return (
    <ul className="flex gap-2">
      {badges.map((badge) => {
        const item = badgeCatalog[badge]
        return (
          <li key={badge}>
            <Tooltip delay={0}>
              <Tooltip.Trigger>
                <Button variant="ghost" isIconOnly aria-label={t(item.label_key)}>
                  <img src={item.src} alt="" width={28} height={28} />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>{t(item.label_key)}</Tooltip.Content>
            </Tooltip>
          </li>
        )
      })}
    </ul>
  )
}

type ProfileTabsProps = { tab: 'posts' | 'comments'; onChange: (tab: 'posts' | 'comments') => void }

function ProfileTabs({ tab, onChange }: ProfileTabsProps) {
  const { t } = useT()
  return (
    <Tabs selectedKey={tab} onSelectionChange={(key) => onChange(key === 'comments' ? 'comments' : 'posts')}>
      <Tabs.List aria-label={t('profile.tab.posts')}>
        <Tabs.Tab id="posts">{t('profile.tab.posts')}</Tabs.Tab>
        <Tabs.Tab id="comments">{t('profile.tab.comments')}</Tabs.Tab>
      </Tabs.List>
    </Tabs>
  )
}

function ProfileSkeleton() {
  return (
    <Card aria-hidden="true">
      <Skeleton className="h-40 w-full rounded-none" />
      <Card.Content className="flex flex-col gap-3">
        <Skeleton shape="circle" className="-mt-10 size-16" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-24" />
      </Card.Content>
    </Card>
  )
}

function Root({ children }: { children: ReactNode }) {
  return <Card className="overflow-hidden">{children}</Card>
}

export const ProfileCard = Object.assign(Root, {
  Cover,
  Avatar: AvatarBlock,
  Actions,
  Name,
  Reputation,
  Bio,
  Counts,
  Badges,
  Tabs: ProfileTabs,
  Skeleton: ProfileSkeleton,
})
