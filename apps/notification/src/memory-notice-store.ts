import type { Notice, NoticeStore } from './notice-store';

export class MemoryNoticeStore implements NoticeStore {
  readonly notices: Notice[] = [];
  readonly channels = { email: 0, phone: 0 };

  async insert(notice: Notice): Promise<boolean> {
    const exists = this.notices.some(
      (row) => row.user_id === notice.user_id && row.source_event_id === notice.source_event_id,
    );
    if (exists) {
      return false;
    }
    this.notices.push(notice);
    return true;
  }

  async list(user_id: string): Promise<Notice[]> {
    return this.notices.filter((notice) => notice.user_id === user_id);
  }
}
