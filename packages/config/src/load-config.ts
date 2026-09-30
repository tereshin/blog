export class MissingEnvError extends Error {
  readonly variable_name: string;

  constructor(variable_name: string) {
    super(variable_name);
    this.name = 'MissingEnvError';
    this.variable_name = variable_name;
  }
}

export type AppConfig = {
  database_url: string;
  redis_url: string;
  rabbitmq_url: string;
  minio_endpoint: string;
  minio_access_key: string;
  minio_secret_key: string;
};

function readRequired(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];

  if (value === undefined || value.trim() === '') {
    throw new MissingEnvError(key);
  }

  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  return {
    database_url: readRequired(env, 'DATABASE_URL'),
    redis_url: readRequired(env, 'REDIS_URL'),
    rabbitmq_url: readRequired(env, 'RABBITMQ_URL'),
    minio_endpoint: readRequired(env, 'MINIO_ENDPOINT'),
    minio_access_key: readRequired(env, 'MINIO_ACCESS_KEY'),
    minio_secret_key: readRequired(env, 'MINIO_SECRET_KEY'),
  };
}

export function exitOnInvalidEnv(
  env: NodeJS.ProcessEnv = process.env,
): AppConfig {
  try {
    return loadConfig(env);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'invalid env';
    console.error(message);
    process.exit(1);
  }
}
