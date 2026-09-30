import { describe, expect, it } from 'vitest';
import { redisClientOptions } from '../src/client';

describe('redis client', () => {
  it('uses the given url and does not connect until asked', () => {
    expect(redisClientOptions('redis://127.0.0.1:6379')).toEqual({
      url: 'redis://127.0.0.1:6379',
      lazyConnect: true,
    });
  });
});
