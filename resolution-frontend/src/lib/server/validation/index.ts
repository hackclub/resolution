import { error } from '@sveltejs/kit';
import type { z } from 'zod';

export * from './schemas';

/**
 * Validate data against a Zod schema.
 * Throws a 400 error with validation messages if invalid.
 */
export function validate<T extends z.ZodSchema>(
	schema: T,
	data: unknown
): z.infer<T> {
	const result = schema.safeParse(data);

	if (!result.success) {
		const messages = result.error.issues.map((e: { message: string }) => e.message).join(', ');
		throw error(400, { message: `Validation failed: ${messages}` });
	}

	return result.data;
}

/**
 * Parse FormData into an object and validate against a Zod schema.
 */
export async function validateFormData<T extends z.ZodSchema>(
	schema: T,
	request: Request
): Promise<z.infer<T>> {
	const formData = await request.formData();
	const data: Record<string, unknown> = {};

	for (const [key, value] of formData.entries()) {
		if (typeof value === 'string') {
			const num = Number(value);
			if (!isNaN(num) && value.trim() !== '') {
				data[key] = num;
			} else {
				data[key] = value;
			}
		} else {
			data[key] = value;
		}
	}

	return validate(schema, data);
}

/**
 * Parse JSON body and validate against a Zod schema.
 */
export async function validateJson<T extends z.ZodSchema>(
	schema: T,
	request: Request
): Promise<z.infer<T>> {
	let data: unknown;

	try {
		data = await request.json();
	} catch {
		throw error(400, { message: 'Invalid JSON body' });
	}

	return validate(schema, data);
}
