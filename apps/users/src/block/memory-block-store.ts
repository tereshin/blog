import type { BlockRecord, BlockStore, BlockUser, StaffAudit } from './block-store';

export class MemoryBlockStore implements BlockStore {
  readonly users: BlockUser[] = [];
  readonly blocks: BlockRecord[] = [];
  readonly audits: StaffAudit[] = [];
  readonly content_writes: never[] = [];

  async findByFirebaseUid(firebase_uid: string): Promise<BlockUser | null> {
    return this.users.find((user) => user.firebase_uid === firebase_uid) ?? null;
  }

  async findById(user_id: string): Promise<BlockUser | null> {
    return this.users.find((user) => user.id === user_id) ?? null;
  }

  async findActiveBlock(user_id: string): Promise<BlockRecord | null> {
    return this.blocks.find((block) => block.user_id === user_id && block.lifted_at === null) ?? null;
  }

  async insertBlock(block: BlockRecord, audit: StaffAudit): Promise<void> {
    this.blocks.push(block);
    this.audits.push(audit);
  }

  async liftBlock(block: BlockRecord, audit: StaffAudit): Promise<void> {
    const stored = this.blocks.find((row) => row.id === block.id);
    if (stored) {
      stored.lifted_at = block.lifted_at;
      stored.lifted_by = block.lifted_by;
    }
    this.audits.push(audit);
  }

  async listAudits(actor_id: string | null): Promise<StaffAudit[]> {
    const rows = actor_id
      ? this.audits.filter((entry) => entry.actor_id === actor_id)
      : this.audits;
    return [...rows].sort((left, right) => {
      if (left.created_at === right.created_at) {
        return right.id.localeCompare(left.id);
      }
      return right.created_at.localeCompare(left.created_at);
    });
  }
}
