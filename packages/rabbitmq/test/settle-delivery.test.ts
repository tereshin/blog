import { describe, expect, it } from 'vitest';
import {
  retryDelayMs,
  settleWorkerDelivery,
  type WorkerMessage,
} from '../src/settle-delivery';

const message: WorkerMessage = {
  content: Buffer.from('{"eventId":"1"}'),
  fields: { routingKey: 'caller.queue' },
};

function channel() {
  const acked: WorkerMessage[] = [];
  const published: Array<{
    routing_key: string;
    headers: Record<string, unknown>;
  }> = [];

  return {
    acked,
    published,
    fake: {
      ack(current: WorkerMessage) {
        acked.push(current);
      },
      publish(
        _exchange: string,
        routing_key: string,
        _content: Buffer,
        options: { headers: Record<string, unknown> },
      ) {
        published.push({ routing_key, headers: options.headers });
        return true;
      },
    },
  };
}

describe('worker delivery', () => {
  it('acks a successful delivery and does not publish', async () => {
    const broker = channel();

    await settleWorkerDelivery({
      channel: broker.fake,
      message,
      failed: false,
      attempt: 1,
      max_attempts: 3,
      queue_name: 'caller.queue',
      dead_letter_queue: 'caller.dlq',
      base_delay_ms: 1000,
    });

    expect(broker.acked).toEqual([message]);
    expect(broker.published).toEqual([]);
  });

  it('retries with exponential delay and manual ack of the original', async () => {
    const broker = channel();

    await settleWorkerDelivery({
      channel: broker.fake,
      message,
      failed: true,
      attempt: 1,
      max_attempts: 3,
      queue_name: 'caller.queue',
      dead_letter_queue: 'caller.dlq',
      base_delay_ms: 1000,
    });

    expect(retryDelayMs(1, 1000)).toBe(1000);
    expect(retryDelayMs(2, 1000)).toBe(2000);
    expect(broker.published).toEqual([
      {
        routing_key: 'caller.queue',
        headers: { 'x-attempt': 2, 'x-delay': 1000 },
      },
    ]);
    expect(broker.acked).toEqual([message]);
  });

  it('routes an exhausted delivery to the caller dead-letter queue', async () => {
    const broker = channel();

    await settleWorkerDelivery({
      channel: broker.fake,
      message,
      failed: true,
      attempt: 3,
      max_attempts: 3,
      queue_name: 'caller.queue',
      dead_letter_queue: 'caller.dlq',
      base_delay_ms: 1000,
    });

    expect(broker.published[0]?.routing_key).toBe('caller.dlq');
    expect(broker.acked).toEqual([message]);
  });
});
