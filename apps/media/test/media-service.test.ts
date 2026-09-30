import { describe, expect, it } from 'vitest';
import { MediaService, MemoryMediaStore } from '../src/media-service';

describe('media uploads', () => {
  it('issues a presigned URL that carries no image bytes', async () => {
    const media = new MediaService(new MemoryMediaStore());
    const issued = await media.issue({
      owner_user_id: '018f3c2a-7b10-7c3e-8f21-0000000000b1',
      content_type: 'image/png',
    });

    expect(issued.status).toBe('pending');
    expect(issued.upload_url.startsWith('https://media.local/')).toBe(true);
    expect(issued.upload_url.includes('data:image')).toBe(false);
    expect(issued).not.toHaveProperty('bytes');

    const ready = await media.complete(issued.id);
    expect(ready?.status).toBe('ready');
  });
});
