export function parseConfig(env) {
  const port = Number(env.PORT);
  const databaseUrl = env.DATABASE_URL?.trim();

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  if (!databaseUrl?.startsWith('postgresql://')) {
    throw new Error('DATABASE_URL must use postgresql://');
  }

  return { port, databaseUrl };
}
