import { describe, expect, it } from 'vitest';
import { writeLog } from '../src/log';

describe('json log', () => {
  it('includes the request id and the correlation id', () => {
    const lines: string[] = [];

    writeLog(
      { write: (line) => lines.push(line) },
      {
        level: 'info',
        request_id: 'req-7',
        correlation_id: 'corr-9',
        event: 'article.read',
      },
    );

    const parsed = JSON.parse(lines[0] ?? '') as {
      request_id: string;
      correlation_id: string;
    };

    expect(parsed.request_id).toBe('req-7');
    expect(parsed.correlation_id).toBe('corr-9');
  });
});
