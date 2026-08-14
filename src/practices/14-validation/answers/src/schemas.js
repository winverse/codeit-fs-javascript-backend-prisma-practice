import { Buffer } from 'node:buffer';
import { z } from 'zod';

const hasEnoughPasswordCharacters = (password) => [...password].length >= 15;
const fitsBcryptPasswordLimit = (password) =>
  Buffer.byteLength(password, 'utf8') <= 72;

export const signupSchema = z.object({
  email: z.email(),
  password: z
    .string()
    .refine(hasEnoughPasswordCharacters)
    .refine(fitsBcryptPasswordLimit),
  name: z.string().trim().min(1).max(50),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).refine(fitsBcryptPasswordLimit),
});
