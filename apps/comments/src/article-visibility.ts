export interface ArticleVisibility {
  isPublished(article_id: string): Promise<boolean>;
}
