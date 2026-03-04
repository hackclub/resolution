import { z } from 'zod';

export const createShipSchema = z.object({
	seasonId: z.string().min(1, 'Season ID is required'),
	weekNumber: z.number().int().min(1).max(52),
	goalText: z
		.string()
		.min(3, 'Goal must be at least 3 characters')
		.max(500, 'Goal must be less than 500 characters'),
	workshopId: z.string().optional()
});

export const markShippedSchema = z.object({
	shipId: z.string().min(1, 'Ship ID is required'),
	proofUrl: z
		.string()
		.url('Proof URL must be a valid URL')
		.max(2000, 'URL is too long'),
	notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional()
});

export const updateShipStatusSchema = z.object({
	shipId: z.string().min(1, 'Ship ID is required'),
	status: z.enum(['PLANNED', 'IN_PROGRESS', 'SHIPPED', 'MISSED'])
});

export const enrollSeasonSchema = z.object({
	seasonSlug: z
		.string()
		.min(1, 'Season slug is required')
		.max(50)
		.regex(/^[a-z0-9-]+$/, 'Invalid season slug format')
});

export const workshopIdSchema = z.object({
	workshopId: z.string().min(1, 'Workshop ID is required')
});

export const projectSubmissionSchema = z.object({
	codeUrl: z.string().url('Please enter a valid URL').max(2000),
	playableUrl: z.string().url('Please enter a valid URL').max(2000),
	howDidYouHear: z.string().min(1, 'This field is required').max(500),
	doingWell: z.string().min(1, 'This field is required').max(1000),
	improvements: z.string().min(1, 'This field is required').max(1000),
	firstName: z.string().min(1, 'First name is required').max(100),
	lastName: z.string().min(1, 'Last name is required').max(100),
	email: z.string().email('Please enter a valid email').max(254).transform((v) => v.trim().toLowerCase()),
	description: z.string().min(1, 'Description is required').max(2000),
	githubUsername: z.string().min(1, 'GitHub username is required').max(100),
	addressLine1: z.string().min(1, 'Address is required').max(200),
	addressLine2: z.string().max(200).optional().default(''),
	city: z.string().min(1, 'City is required').max(100),
	stateProvince: z.string().min(1, 'State / Province is required').max(100),
	country: z.string().min(1, 'Country is required').max(100),
	zipPostalCode: z.string().min(1, 'ZIP / Postal code is required').max(20),
	birthday: z.string().min(1, 'Birthday is required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date'),
	hackatimeProject: z.string().min(1, 'Hackatime project is required').max(200),
	pathway: z.string().min(1),
	week: z.number().int().min(1).max(8)
});

export type ProjectSubmissionInput = z.infer<typeof projectSubmissionSchema>;

export type CreateShipInput = z.infer<typeof createShipSchema>;
export type MarkShippedInput = z.infer<typeof markShippedSchema>;
export type UpdateShipStatusInput = z.infer<typeof updateShipStatusSchema>;
export type EnrollSeasonInput = z.infer<typeof enrollSeasonSchema>;
