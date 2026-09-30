import Redis from 'ioredis';

export function redisClientOptions(url: string): {
  url: string;
  lazyConnect: true;
} {
  return {
    url,
    lazyConnect: true,
  };
}

export function createRedisClient(url: string): Redis {
  const options = redisClientOptions(url);

  return new Redis(options.url, { lazyConnect: options.lazyConnect });
}
