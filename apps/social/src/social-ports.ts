export interface KnownUsers {
  exists(user_id: string): Promise<boolean>;
}

export interface KnownCategories {
  exists(category_id: string): Promise<boolean>;
}
