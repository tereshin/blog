export const followKeys = {
  all: ['follows'] as const,
  flag: (target_type: string, target_id: string) =>
    ['follows', 'flag', target_type, target_id] as const,
  mutation: (target_type: string, target_id: string) =>
    ['follows', 'mutation', target_type, target_id] as const,
  batch: (viewer_id: string, target_type: string, target_ids: string[]) =>
    ['follows', 'batch', viewer_id, target_type, target_ids] as const,
}
