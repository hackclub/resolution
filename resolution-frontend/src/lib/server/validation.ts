import { z } from 'zod';

export const submitResolutionSchema = z.object({
	email: z
		.string()
		.min(1, 'Email is required')
		.max(254, 'Email is too long')
		.email('Invalid email format')
		.transform((val) => val.trim().toLowerCase())
});

export type SubmitResolutionInput = z.infer<typeof submitResolutionSchema>;

export const registerSchema = z.object({
	email: z
		.string()
		.min(1, 'Email is required')
		.max(254, 'Email is too long')
		.email('Invalid email format')
		.transform((val) => val.trim().toLowerCase()),
	password: z
		.string()
		.min(8, 'Password must be at least 8 characters')
		.max(100, 'Password is too long')
});

export const loginSchema = z.object({
	email: z
		.string()
		.min(1, 'Email is required')
		.max(254, 'Email is too long')
		.email('Invalid email format')
		.transform((val) => val.trim().toLowerCase()),
	password: z
		.string()
		.min(1, 'Password is required')
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// Re-export from validation module for convenience
export * from './validation/index';
