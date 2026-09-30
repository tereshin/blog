export type ErrorEnvelope = {
  error: {
    code: string;
    params: Record<string, unknown>;
  };
};

export type EventEnvelope = {
  eventId: string;
  eventType: string;
  eventVersion: number;
  timestamp: string;
  producer: string;
  correlationId: string | null;
  causationId: string | null;
  data: Record<string, unknown>;
};

const required_event_fields = [
  'eventId',
  'eventType',
  'eventVersion',
  'timestamp',
  'producer',
  'data',
] as const;

export function errorEnvelope(
  code: string,
  params: Record<string, unknown> = {},
): ErrorEnvelope {
  return {
    error: {
      code,
      params,
    },
  };
}

export function parseEventEnvelope(value: unknown): EventEnvelope {
  if (typeof value !== 'object' || value === null) {
    throw new Error('eventId');
  }

  const record = value as Record<string, unknown>;

  for (const field of required_event_fields) {
    if (record[field] === undefined || record[field] === '') {
      throw new Error(field);
    }
  }

  if (typeof record.eventId !== 'string') {
    throw new Error('eventId');
  }
  if (typeof record.eventType !== 'string') {
    throw new Error('eventType');
  }
  if (typeof record.eventVersion !== 'number') {
    throw new Error('eventVersion');
  }
  if (typeof record.timestamp !== 'string') {
    throw new Error('timestamp');
  }
  if (typeof record.producer !== 'string') {
    throw new Error('producer');
  }
  if (
    typeof record.data !== 'object' ||
    record.data === null ||
    Array.isArray(record.data)
  ) {
    throw new Error('data');
  }

  const correlation_id = record.correlationId;
  const causation_id = record.causationId;

  return {
    eventId: record.eventId,
    eventType: record.eventType,
    eventVersion: record.eventVersion,
    timestamp: record.timestamp,
    producer: record.producer,
    correlationId:
      typeof correlation_id === 'string' ? correlation_id : null,
    causationId: typeof causation_id === 'string' ? causation_id : null,
    data: record.data as Record<string, unknown>,
  };
}
