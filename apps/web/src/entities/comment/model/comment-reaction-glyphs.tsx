import { createContext, use } from 'react'
import type { ReactNode } from 'react'
import { DEFAULT_REACTION_APPEARANCES } from '@blog/contracts'
import type { ReactionAppearances } from '@blog/contracts'

const CommentReactionGlyphsContext = createContext<ReactionAppearances>(DEFAULT_REACTION_APPEARANCES)

type CommentReactionGlyphsProviderProps = {
  appearances: ReactionAppearances
  children: ReactNode
}

/** Вид реакций для популярных комментариев. Пока провайдер не подставил настройки, остаются эмодзи по умолчанию. */
export function CommentReactionGlyphsProvider({ appearances, children }: CommentReactionGlyphsProviderProps) {
  return <CommentReactionGlyphsContext value={appearances}>{children}</CommentReactionGlyphsContext>
}

export function useCommentReactionGlyphs(): ReactionAppearances {
  return use(CommentReactionGlyphsContext)
}
