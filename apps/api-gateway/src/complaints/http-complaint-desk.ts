import type { ComplaintDesk, ComplaintView } from './complaint-review';

export class HttpComplaintDesk implements ComplaintDesk {
  constructor(private readonly base_url: string) {}

  async listOpen(): Promise<ComplaintView[]> {
    const response = await fetch(`${this.base_url}/api/v1/internal/complaints/open`);
    const body = (await response.json()) as ComplaintView[];
    return body;
  }

  async dismiss(complaint_id: string, reason: string): Promise<ComplaintView | null> {
    const response = await fetch(
      `${this.base_url}/api/v1/internal/complaints/${complaint_id}/dismiss`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason }),
      },
    );
    if (response.status === 404) {
      return null;
    }
    return (await response.json()) as ComplaintView;
  }
}
