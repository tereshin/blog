import { describe, expect, it } from 'vitest';
import { errorEnvelope, parseEventEnvelope } from '../src/envelopes';

const valid_event = {
  eventId: '018f3c2a-7b10-7c3e-8f21-000000000010',
  eventType: 'content.article.published',
  eventVersion: 1,
  timestamp: '2026-01-01T00:00:00.000Z',
  producer: 'content',
  correlationId: null,
  causationId: null,
  data: { article_id: '018f3c2a-7b10-7c3e-8f21-000000000011' },
  extra: true,
};

describe('api error envelope', () => {
  it('returns code and params and no sentence', () => {
    expect(
      errorEnvelope('ARTICLE_VERSION_CONFLICT', { serverVersion: 12 }),
    ).toEqual({
      error: {
        code: 'ARTICLE_VERSION_CONFLICT',
        params: { serverVersion: 12 },
      },
    });
    expect(Object.keys(errorEnvelope('ARTICLE_VERSION_CONFLICT').error)).toEqual([
      'code',
      'params',
    ]);
  });
});

describe('event envelope', () => {
  it('requires eventId, eventType, eventVersion, timestamp, producer, and data', () => {
    const { eventId: _ignored, ...without_id } = valid_event;
    void _ignored;

    expect(() => parseEventEnvelope(without_id)).toThrow(/eventId/);
    expect(parseEventEnvelope(valid_event)).toMatchObject({
      eventId: valid_event.eventId,
      eventType: valid_event.eventType,
      eventVersion: 1,
      producer: 'content',
      correlationId: null,
      data: valid_event.data,
    });
  });
});
