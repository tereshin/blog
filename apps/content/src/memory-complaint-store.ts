import type { ArticleComplaint, ComplaintStore } from './complaint-store';

export class MemoryComplaintStore implements ComplaintStore {
  readonly complaints: ArticleComplaint[] = [];

  async insert(complaint: ArticleComplaint): Promise<void> {
    this.complaints.push(complaint);
  }

  async listOpen(): Promise<ArticleComplaint[]> {
    return this.complaints.filter((complaint) => complaint.status === 'open');
  }

  async dismiss(complaint_id: string, resolution_reason: string): Promise<ArticleComplaint | null> {
    const complaint = this.complaints.find((row) => row.id === complaint_id && row.status === 'open');
    if (!complaint) {
      return null;
    }
    complaint.status = 'dismissed';
    complaint.resolution_reason = resolution_reason;
    return complaint;
  }

  async closeOpen(article_id: string): Promise<void> {
    for (const complaint of this.complaints) {
      if (complaint.article_id === article_id && complaint.status === 'open') {
        complaint.status = 'closed_hidden';
      }
    }
  }
}
