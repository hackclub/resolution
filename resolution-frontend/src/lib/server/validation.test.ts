import { describe, it, expect } from 'vitest';
import { submitResolutionSchema } from './validation';

describe('submitResolutionSchema', () => {
	it('accepts a valid email', () => {
		const result = submitResolutionSchema.safeParse({ email: 'test@example.com' });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.email).toBe('test@example.com');
		}
	});

	it('trims and lowercases email', () => {
		const result = submitResolutionSchema.safeParse({ email: 'Test@Example.COM' });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.email).toBe('test@example.com');
		}
	});

	it('rejects an empty email', () => {
		const result = submitResolutionSchema.safeParse({ email: '' });
		expect(result.success).toBe(false);
	});

	it('rejects an invalid email', () => {
		const result = submitResolutionSchema.safeParse({ email: 'not-an-email' });
		expect(result.success).toBe(false);
	});
});
