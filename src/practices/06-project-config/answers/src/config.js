import { z } from 'zod';

const databaseUrlSchema = z
  .url()
  .refine(
    (url) => url.startsWith('postgresql:') || url.startsWith('postgres:'),
    'DATABASE_URL must use postgresql: or postgres:',
  );

export function parseConfig(env) {
  const port = Number(env.PORT);
  const databaseUrl = env.DATABASE_URL?.trim();

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }
  databaseUrlSchema.parse(databaseUrl);

  return { port, databaseUrl };
}
