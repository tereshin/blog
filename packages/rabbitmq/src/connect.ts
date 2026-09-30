import amqp from 'amqplib';

export async function connectConfirmed(url: string): Promise<{
  connection: Awaited<ReturnType<typeof amqp.connect>>;
  channel: Awaited<
    ReturnType<Awaited<ReturnType<typeof amqp.connect>>['createConfirmChannel']>
  >;
}> {
  const connection = await amqp.connect(url);
  const channel = await connection.createConfirmChannel();

  return { connection, channel };
}

export const manual_ack = { noAck: false } as const;
