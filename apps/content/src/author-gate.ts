export interface AuthorGate {
  hasUsername(user_id: string): Promise<boolean>;
  isBlocked(user_id: string): Promise<boolean>;
}
