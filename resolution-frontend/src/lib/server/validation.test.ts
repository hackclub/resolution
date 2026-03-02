import { describe, it, expect } from 'vitest';
import { submitResolutionSchema, registerSchema, loginSchema } from './validation';

describe('submitResolutionSchema', () => {
	it('accepts a valid email', () => {
		const result = submitResolutionSchema.safeParse({ email: 'test@example.com' });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.email).toBe('test@example.com');
		}
	});

	it('lowercases email', () => {
		const result = submitResolutionSchema.safeParse({ email: 'Test@Example.COM' });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.email).toBe('test@example.com');
		}
	});

	it('rejects empty email', () => {
		const result = submitResolutionSchema.safeParse({ email: '' });
		expect(result.success).toBe(false);
	});

	it('rejects invalid email format', () => {
		const result = submitResolutionSchema.safeParse({ email: 'not-an-email' });
		expect(result.success).toBe(false);
	});

	it('rejects email exceeding max length', () => {
		const longEmail = 'a'.repeat(250) + '@b.com';
		const result = submitResolutionSchema.safeParse({ email: longEmail });
		expect(result.success).toBe(false);
	});
});

describe('registerSchema', () => {
	it('accepts valid email and password', () => {
		const result = registerSchema.safeParse({ email: 'user@test.com', password: 'password123' });
		expect(result.success).toBe(true);
	});

	it('rejects password shorter than 8 characters', () => {
		const result = registerSchema.safeParse({ email: 'user@test.com', password: 'short' });
		expect(result.success).toBe(false);
	});

	it('rejects password exceeding 100 characters', () => {
		const result = registerSchema.safeParse({ email: 'user@test.com', password: 'a'.repeat(101) });
		expect(result.success).toBe(false);
	});

	it('accepts password exactly 8 characters', () => {
		const result = registerSchema.safeParse({ email: 'user@test.com', password: '12345678' });
		expect(result.success).toBe(true);
	});

	it('accepts password exactly 100 characters', () => {
		const result = registerSchema.safeParse({ email: 'user@test.com', password: 'a'.repeat(100) });
		expect(result.success).toBe(true);
	});
});

describe('loginSchema', () => {
	it('accepts valid credentials', () => {
		const result = loginSchema.safeParse({ email: 'user@test.com', password: 'any' });
		expect(result.success).toBe(true);
	});

	it('rejects empty password', () => {
		const result = loginSchema.safeParse({ email: 'user@test.com', password: '' });
		expect(result.success).toBe(false);
	});

	it('lowercases email', () => {
		const result = loginSchema.safeParse({ email: 'Admin@Test.COM', password: 'pass' });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.email).toBe('admin@test.com');
		}
	});
});
