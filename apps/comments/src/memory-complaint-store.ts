import type { CommentComplaint, ComplaintStore } from './complaint-store';

export class MemoryComplaintStore implements ComplaintStore {
  readonly complaints: CommentComplaint[] = [];

  async insert(complaint: CommentComplaint): Promise<void> {
    this.complaints.push(complaint);
  }

  async listOpen(): Promise<CommentComplaint[]> {
    return this.complaints.filter((complaint) => complaint.status === 'open');
  }

  async dismiss(complaint_id: string, resolution_reason: string): Promise<CommentComplaint | null> {
    const complaint = this.complaints.find((row) => row.id === complaint_id && row.status === 'open');
    if (!complaint) {
      return null;
    }
    complaint.status = 'dismissed';
    complaint.resolution_reason = resolution_reason;
    return complaint;
  }

  async closeOpen(comment_id: string): Promise<void> {
    for (const complaint of this.complaints) {
      if (complaint.comment_id === comment_id && complaint.status === 'open') {
        complaint.status = 'closed_hidden';
      }
    }
  }
}
