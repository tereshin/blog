export type WorkerMessage = {
  content: Buffer;
  fields: { routingKey: string };
};

export type WorkerChannel = {
  ack: (message: WorkerMessage) => void;
  publish: (
    exchange: string,
    routing_key: string,
    content: Buffer,
    options: { headers: Record<string, unknown> },
  ) => boolean;
};

export function retryDelayMs(attempt: number, base_delay_ms: number): number {
  return base_delay_ms * 2 ** (attempt - 1);
}

export async function settleWorkerDelivery(input: {
  channel: WorkerChannel;
  message: WorkerMessage;
  failed: boolean;
  attempt: number;
  max_attempts: number;
  queue_name: string;
  dead_letter_queue: string;
  base_delay_ms: number;
}): Promise<void> {
  if (!input.failed) {
    input.channel.ack(input.message);
    return;
  }

  if (input.attempt >= input.max_attempts) {
    input.channel.publish('', input.dead_letter_queue, input.message.content, {
      headers: { 'x-attempt': input.attempt },
    });
    input.channel.ack(input.message);
    return;
  }

  input.channel.publish('', input.queue_name, input.message.content, {
    headers: {
      'x-attempt': input.attempt + 1,
      'x-delay': retryDelayMs(input.attempt, input.base_delay_ms),
    },
  });
  input.channel.ack(input.message);
}
