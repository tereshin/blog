import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { ArticleCard, useArticleStates } from '@/entities/article'
import type { ArticleCardModel } from '@/entities/article'
import { useSearch } from '@/entities/search'
import type { SearchArticle } from '@/entities/search'
import { useViewer } from '@/entities/session'
import { TopicNavItem } from '@/entities/topic'
import { UserListItem } from '@/entities/user'
import { BookmarkControl } from '@/features/bookmark'
import { FollowButton } from '@/features/follow'
import { ReactionControl } from '@/features/react'
import { ShareButton } from '@/features/share-article'
import { useT } from '@/shared/i18n'
import { EmptyState, ErrorState, SearchIcon } from '@/shared/ui'
import { ArticleOverflowMenu } from '@/widgets/feed'
import { useShellStore } from '@/widgets/shell'

function asCard(article: SearchArticle): ArticleCardModel {
  return article
}

export default function SearchPage() {
  const { t } = useT()
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const search = useSearch(q)
  const { viewer, is_own } = useViewer()
  const setHeaderCenter = useShellStore((state) => state.setHeaderCenter)
  const articles = (search.data?.articles ?? []).map(asCard)
  const states = useArticleStates(articles.map((item) => item.id), viewer.status === 'member')

  useEffect(() => {
    setHeaderCenter({ kind: 'empty' })
  }, [setHeaderCenter])

  const nothing = search.data && search.data.articles.length === 0 && search.data.people.length === 0 && search.data.topics.length === 0

  return (
    <div className="flex flex-col gap-6">
      {search.isError ? <ErrorState title={t('search.error')} onRetry={() => void search.refetch()} /> : null}
      {q.trim().length < 2 || (!search.isError && nothing) ? (
        <EmptyState
          title={t(q.trim().length < 2 ? 'search.prompt' : 'search.empty')}
          description={t(q.trim().length < 2 ? 'search.prompt_hint' : 'search.empty_hint')}
          icon={<SearchIcon width={28} height={28} />}
        />
      ) : null}
      {search.data && search.data.articles.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h1 className="text-sm font-medium text-muted">{t('search.articles')}</h1>
          {articles.map((article) => {
            const viewer_state = states.get(article.id)
            return (
              <ArticleCard key={article.id} article={article}>
                <ArticleCard.Header
                  follow={
                    <FollowButton
                      target_type="user"
                      target_id={article.author.user_id}
                      is_following={article.is_following ?? false}
                      is_own={is_own(article.author.user_id)}
                    />
                  }
                  menu={<ArticleOverflowMenu article_id={article.id} slug={article.slug} is_own={is_own(article.author.user_id)} />}
                />
                <ArticleCard.Title />
                <ArticleCard.Excerpt />
                <ArticleCard.Image />
                <ArticleCard.Reactions>
                  {viewer_state ? (
                    <ReactionControl target_type="article" target_id={article.id} slug={article.slug} counts={article.reaction_counts} my_reaction={viewer_state.my_reaction} />
                  ) : null}
                </ArticleCard.Reactions>
                <ArticleCard.Actions
                  bookmark={
                    viewer_state ? (
                      <BookmarkControl article_id={article.id} slug={article.slug} count={article.bookmark_count} is_bookmarked={viewer_state.is_bookmarked} />
                    ) : null
                  }
                  share={<ShareButton slug={article.slug} />}
                />
              </ArticleCard>
            )
          })}
        </section>
      ) : null}
      {search.data && search.data.people.length > 0 ? (
        <section>
          <h2 className="text-sm font-medium text-muted">{t('search.people')}</h2>
          <ul>
            {search.data.people.map((person) => (
              <UserListItem key={person.user_id} user={person} />
            ))}
          </ul>
        </section>
      ) : null}
      {search.data && search.data.topics.length > 0 ? (
        <section className="flex flex-col gap-1">
          <h2 className="text-sm font-medium text-muted">{t('search.topics')}</h2>
          {search.data.topics.map((topic) => (
            <TopicNavItem key={topic.id} topic={topic} />
          ))}
        </section>
      ) : null}
    </div>
  )
}
