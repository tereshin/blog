export type UserListItemModel = {
  user_id: string
  display_name: string
  avatar_url: string | null
  slug: string
  reputation: number
  href: string
}

export type UserListPage = { items: UserListItemModel[]; next_cursor: string | null }
