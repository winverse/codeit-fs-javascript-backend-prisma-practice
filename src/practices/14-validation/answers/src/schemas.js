import { z } from 'zod';

export const signupSchema = z
  .object({
    email: z.email(),
    password: z.string().min(8).max(72),
    name: z.string().trim().min(1).max(50),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.email(),
    password: z.string().min(1),
  })
  .strict();
