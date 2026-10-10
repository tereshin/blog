import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { badgeCatalog, formatReputation } from '@/entities/profile'
import type { Profile, ProfileBadge } from '@/entities/profile'
import { useT } from '@/shared/i18n'
import { IdentityHeader, Tabs, Tooltip } from '@/shared/ui'

type CoverProps = { url: string | null; is_own: boolean; action?: ReactNode }

function Cover({ url, is_own, action }: CoverProps) {
  return <IdentityHeader.Cover url={url} action={is_own ? action : null} />
}

function AvatarBlock({ profile, action }: { profile: Profile; action?: ReactNode }) {
  return <IdentityHeader.Avatar src={profile.avatar_url} name={profile.display_name} action={profile.is_own ? action : null} />
}

function Name({ profile, aside }: { profile: Profile; aside?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <h1 className="min-w-0 break-words text-2xl font-semibold leading-tight tracking-tight">
        {profile.display_name}
      </h1>
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
  return <p className="whitespace-pre-wrap break-words text-[15px] leading-6">{profile.bio}</p>
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
    <ul className="flex flex-wrap gap-2">
      {badges.map((badge) => {
        const item = badgeCatalog[badge]
        return (
          <li key={badge}>
            <Tooltip delay={0}>
              <Tooltip.Trigger
                aria-label={t(item.label_key)}
                className="grid size-10 place-items-center rounded-avatar outline-offset-2 hover:bg-surface-secondary"
              >
                <img src={item.src} alt="" width={32} height={32} />
              </Tooltip.Trigger>
              <Tooltip.Content>{t(item.label_key)}</Tooltip.Content>
            </Tooltip>
          </li>
        )
      })}
    </ul>
  )
}

function ProfileTabs() {
  const { t } = useT()
  return (
    <Tabs.List aria-label={t('profile.tab.posts')}>
      <Tabs.Tab id="posts">{t('profile.tab.posts')}</Tabs.Tab>
      <Tabs.Tab id="comments">{t('profile.tab.comments')}</Tabs.Tab>
    </Tabs.List>
  )
}

export const ProfileCard = Object.assign(
  function ProfileCardRoot({ children }: { children: ReactNode }) {
    return <IdentityHeader>{children}</IdentityHeader>
  },
  {
    Cover,
    Avatar: AvatarBlock,
    Identity: IdentityHeader.Identity,
    Content: IdentityHeader.Content,
    Navigation: IdentityHeader.Navigation,
    Name,
    Reputation,
    Bio,
    Counts,
    Badges,
    Tabs: ProfileTabs,
    Skeleton: IdentityHeader.Skeleton,
  },
)
