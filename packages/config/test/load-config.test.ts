import { describe, expect, it, vi } from 'vitest';
import {
  MissingEnvError,
  exitOnInvalidEnv,
  loadConfig,
} from '../src/load-config';

const complete_env = {
  DATABASE_URL: 'postgres://blog:blog@127.0.0.1:5432/blog',
  REDIS_URL: 'redis://127.0.0.1:6379',
  RABBITMQ_URL: 'amqp://blog:blog@127.0.0.1:5672',
  MINIO_ENDPOINT: 'http://127.0.0.1:9000',
  MINIO_ACCESS_KEY: 'blog',
  MINIO_SECRET_KEY: 'blogblogblog',
};

describe('load config', () => {
  it('rejects a missing DATABASE_URL', () => {
    const env = { ...complete_env, DATABASE_URL: undefined };

    expect(() => loadConfig(env)).toThrow(MissingEnvError);
    expect(() => loadConfig(env)).toThrow(/DATABASE_URL/);
  });

  it('rejects a missing REDIS_URL', () => {
    const env = { ...complete_env, REDIS_URL: '' };

    expect(() => loadConfig(env)).toThrow(MissingEnvError);
    expect(() => loadConfig(env)).toThrow(/REDIS_URL/);
  });

  it('exits before listening when required env is missing', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    const env = { ...complete_env, DATABASE_URL: undefined };

    expect(() => exitOnInvalidEnv(env)).toThrow('exit');
    expect(exit).toHaveBeenCalledWith(1);
    exit.mockRestore();
  });

  it('returns the store urls when every required variable is set', () => {
    expect(loadConfig(complete_env)).toEqual({
      database_url: complete_env.DATABASE_URL,
      redis_url: complete_env.REDIS_URL,
      rabbitmq_url: complete_env.RABBITMQ_URL,
      minio_endpoint: complete_env.MINIO_ENDPOINT,
      minio_access_key: complete_env.MINIO_ACCESS_KEY,
      minio_secret_key: complete_env.MINIO_SECRET_KEY,
    });
  });
});
