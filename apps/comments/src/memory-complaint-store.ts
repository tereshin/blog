import type { CommentComplaint, ComplaintStore } from './complaint-store';

export class MemoryComplaintStore implements ComplaintStore {
  readonly complaints: CommentComplaint[] = [];

  async insert(complaint: CommentComplaint): Promise<void> {
    this.complaints.push(complaint);
  }

  async listOpen(): Promise<CommentComplaint[]> {
    return this.complaints.filter((complaint) => complaint.status === 'open');
  }
}
