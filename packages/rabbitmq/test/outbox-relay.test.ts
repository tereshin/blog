import { describe, expect, it } from 'vitest';
import { OutboxRelay, type OutboxRow } from '../src/outbox-relay';

const content_id = '018f3c2a-7b10-7c3e-8f21-0000000000a1';
const newer_id = '018f3c2a-7b10-7c3e-8f21-0000000000a2';
const comment_id = '018f3c2a-7b10-7c3e-8f21-0000000000d1';

function row(partial: Partial<OutboxRow> & Pick<OutboxRow, 'id' | 'created_at'>): OutboxRow {
  return {
    event_type: 'content.article.published',
    aggregate_id: partial.id,
    payload: { article_id: partial.id },
    correlation_id: null,
    causation_id: null,
    producer: 'content',
    event_version: 1,
    published_at: null,
    ...partial,
  };
}

function memory(schema_name: string, rows: OutboxRow[], selected: string[]) {
  return {
    schema_name,
    async oldestUnpublished() {
      selected.push(schema_name);
      const unpublished = rows
        .filter((item) => item.published_at === null)
        .sort((left, right) => left.created_at.localeCompare(right.created_at));
      return unpublished[0] ?? null;
    },
    async markPublished(id: string, published_at: string) {
      const found = rows.find((item) => item.id === id);
      if (found) {
        found.published_at = published_at;
      }
    },
  };
}

describe('outbox relay', () => {
  it('publishes the oldest row of one schema and does not select another', async () => {
    const selected: string[] = [];
    const content_rows = [
      row({ id: newer_id, created_at: '2026-09-30T00:00:02.000Z' }),
      row({ id: content_id, created_at: '2026-09-30T00:00:01.000Z' }),
    ];
    const comment_rows = [
      row({
        id: comment_id,
        created_at: '2026-09-30T00:00:00.000Z',
        event_type: 'comments.comment.created',
        producer: 'comments',
      }),
    ];
    const published: Array<{ eventId: string; eventType: string }> = [];
    const relay = new OutboxRelay({
      schema_name: 'content',
      source: memory('content', content_rows, selected),
      publisher: {
        async confirm(envelope) {
          published.push({ eventId: envelope.eventId, eventType: envelope.eventType });
        },
        async deadLetter() {},
      },
      alert: { lag() {} },
      now: () => Date.parse('2026-09-30T00:00:01.100Z'),
      max_attempts: 3,
      base_delay_ms: 100,
    });
    void memory('comments', comment_rows, selected);

    await relay.tick();

    expect(selected).toEqual(['content']);
    expect(published).toEqual([{ eventId: content_id, eventType: 'content.article.published' }]);
    expect(content_rows.find((item) => item.id === content_id)?.published_at).toBe(
      '2026-09-30T00:00:01.100Z',
    );
    expect(comment_rows[0]?.published_at).toBeNull();
  });

  it('leaves published_at null when the broker rejects, then dead-letters', async () => {
    const selected: string[] = [];
    const rows = [row({ id: content_id, created_at: '2026-09-30T00:00:00.000Z' })];
    const dead: string[] = [];
    const relay = new OutboxRelay({
      schema_name: 'content',
      source: memory('content', rows, selected),
      publisher: {
        async confirm() {
          throw new Error('broker down');
        },
        async deadLetter(envelope) {
          dead.push(envelope.eventId);
        },
      },
      alert: { lag() {} },
      now: () => Date.parse('2026-09-30T00:00:10.000Z'),
      max_attempts: 3,
      base_delay_ms: 0,
    });

    await relay.tick();
    await relay.tick();
    await relay.tick();
    expect(rows[0]?.published_at).toBeNull();
    expect(dead).toEqual([]);

    await relay.tick();
    expect(dead).toEqual([content_id]);
    expect(rows[0]?.published_at).toBe('2026-09-30T00:00:10.000Z');
  });

  it('alerts when the oldest unpublished row is older than 500 ms', async () => {
    const selected: string[] = [];
    const alerts: number[] = [];
    const relay = new OutboxRelay({
      schema_name: 'content',
      source: memory('content', [row({ id: content_id, created_at: '2026-09-30T00:00:00.000Z' })], selected),
      publisher: { async confirm() {}, async deadLetter() {} },
      alert: { lag(input) { alerts.push(input.lag_ms); } },
      now: () => Date.parse('2026-09-30T00:00:00.600Z'),
      max_attempts: 3,
      base_delay_ms: 100,
    });

    await relay.tick();
    expect(alerts[0]).toBeGreaterThan(500);
  });
});
