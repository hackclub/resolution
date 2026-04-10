import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { ambassadorPathway, pathwayWeekContent } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { HACK_CLUB_CDN_API_KEY } from '$env/static/private';

const validPathways = ['PYTHON', 'RUST', 'GAME_DEV', 'HARDWARE', 'DESIGN', 'GENERAL_CODING'] as const;
type Pathway = typeof validPathways[number];
const ALLOWED_PRIZE_IMAGE_HOSTS = new Set(['cdn.hackclub.com', 'user-cdn.hackclub-assets.com']);

function detectImageMimeType(bytes: Uint8Array): string | null {
	if (bytes.length >= 8) {
		const isPng =
			bytes[0] === 0x89 &&
			bytes[1] === 0x50 &&
			bytes[2] === 0x4e &&
			bytes[3] === 0x47 &&
			bytes[4] === 0x0d &&
			bytes[5] === 0x0a &&
			bytes[6] === 0x1a &&
			bytes[7] === 0x0a;
		if (isPng) return 'image/png';
	}

	if (bytes.length >= 3) {
		const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
		if (isJpeg) return 'image/jpeg';
	}

	if (bytes.length >= 6) {
		const isGif87a =
			bytes[0] === 0x47 &&
			bytes[1] === 0x49 &&
			bytes[2] === 0x46 &&
			bytes[3] === 0x38 &&
			bytes[4] === 0x37 &&
			bytes[5] === 0x61;
		const isGif89a =
			bytes[0] === 0x47 &&
			bytes[1] === 0x49 &&
			bytes[2] === 0x46 &&
			bytes[3] === 0x38 &&
			bytes[4] === 0x39 &&
			bytes[5] === 0x61;
		if (isGif87a || isGif89a) return 'image/gif';
	}

	if (bytes.length >= 12) {
		const isRiff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
		const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
		if (isRiff && isWebp) return 'image/webp';
	}

	return null;
}

function parsePrizeImageUrl(rawValue: FormDataEntryValue | null) {
	const value = typeof rawValue === 'string' ? rawValue.trim() : '';

	if (!value) {
		return { value: null as string | null, error: null as string | null };
	}

	try {
		const parsed = new URL(value);
		if (parsed.protocol !== 'https:') {
			return { value: null, error: 'Prize image URL must use https://' };
		}

		if (!ALLOWED_PRIZE_IMAGE_HOSTS.has(parsed.hostname)) {
			return {
				value: null,
				error: 'Prize image URL must be hosted on a Hack Club CDN domain'
			};
		}

		return { value, error: null };
	} catch {
		return { value: null, error: 'Prize image URL must be a valid URL' };
	}
}

export const load: PageServerLoad = async ({ params, parent }) => {
	const { user } = await parent();
	const pathwayId = params.pathway.toUpperCase() as Pathway;
	const weekNumber = parseInt(params.week);

	if (!validPathways.includes(pathwayId)) {
		throw error(404, 'Pathway not found');
	}

	if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 8) {
		throw error(404, 'Invalid week number');
	}

	const assignment = await db
		.select()
		.from(ambassadorPathway)
		.where(and(eq(ambassadorPathway.userId, user.id), eq(ambassadorPathway.pathway, pathwayId)))
		.limit(1);

	if (assignment.length === 0 && !user.isAdmin) {
		throw error(403, 'You are not assigned to this pathway');
	}

	const content = await db
		.select()
		.from(pathwayWeekContent)
		.where(and(eq(pathwayWeekContent.pathway, pathwayId), eq(pathwayWeekContent.weekNumber, weekNumber)))
		.limit(1);

	return {
		pathwayId,
		weekNumber,
		content: content[0] || null
	};
};

export const actions: Actions = {
	uploadPrizeImage: async ({ request, params, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Not authenticated' });
		}

		const pathwayId = params.pathway.toUpperCase() as Pathway;

		if (!validPathways.includes(pathwayId)) {
			return fail(400, { error: 'Invalid pathway' });
		}

		const assignment = await db
			.select()
			.from(ambassadorPathway)
			.where(and(eq(ambassadorPathway.userId, locals.user.id), eq(ambassadorPathway.pathway, pathwayId)))
			.limit(1);

		if (assignment.length === 0 && !locals.user.isAdmin) {
			return fail(403, { error: 'Not authorized' });
		}

		const formData = await request.formData();
		const file = formData.get('file');

		if (!(file instanceof File)) {
			return fail(400, { error: 'Missing file parameter' });
		}

		if (!file.type.startsWith('image/')) {
			return fail(400, { error: 'Only image uploads are allowed' });
		}

		if (file.size > 10 * 1024 * 1024) {
			return fail(400, { error: 'Image must be 10MB or smaller' });
		}

		const fileBytes = new Uint8Array(await file.arrayBuffer());
		const detectedMimeType = detectImageMimeType(fileBytes);
		if (!detectedMimeType) {
			return fail(400, { error: 'Only JPEG, PNG, GIF, and WebP images are allowed' });
		}

		const upstreamForm = new FormData();
		const normalizedFile = new File([fileBytes], file.name, { type: detectedMimeType });
		upstreamForm.append('file', normalizedFile, normalizedFile.name);

		const uploadResponse = await fetch('https://cdn.hackclub.com/api/v4/upload', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${HACK_CLUB_CDN_API_KEY}`
			},
			body: upstreamForm
		});

		const uploadResult = await uploadResponse.json().catch(() => ({}));

		if (!uploadResponse.ok) {
			const errorMessage =
				typeof uploadResult?.error === 'string'
					? uploadResult.error
					: 'Failed to upload image to Hack Club CDN';
			return fail(uploadResponse.status, { error: errorMessage });
		}

		if (typeof uploadResult?.url !== 'string' || uploadResult.url.length === 0) {
			return fail(502, { error: 'Hack Club CDN did not return a valid image URL' });
		}

		return {
			success: true,
			url: uploadResult.url
		};
	},

	save: async ({ request, params, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Not authenticated' });
		}

		const pathwayId = params.pathway.toUpperCase() as Pathway;
		const weekNumber = parseInt(params.week);

		if (!validPathways.includes(pathwayId)) {
			return fail(400, { error: 'Invalid pathway' });
		}

		const assignment = await db
			.select()
			.from(ambassadorPathway)
			.where(and(eq(ambassadorPathway.userId, locals.user.id), eq(ambassadorPathway.pathway, pathwayId)))
			.limit(1);

		if (assignment.length === 0 && !locals.user.isAdmin) {
			return fail(403, { error: 'Not authorized' });
		}

		const formData = await request.formData();
		const title = formData.get('title') as string;
		const content = formData.get('content') as string;
		const parsedPrizeImage = parsePrizeImageUrl(formData.get('prizeImageUrl'));

		if (parsedPrizeImage.error) {
			return fail(400, { error: parsedPrizeImage.error });
		}

		const existing = await db
			.select()
			.from(pathwayWeekContent)
			.where(and(eq(pathwayWeekContent.pathway, pathwayId), eq(pathwayWeekContent.weekNumber, weekNumber)))
			.limit(1);

		if (existing.length > 0) {
			await db
				.update(pathwayWeekContent)
				.set({
					title,
					content,
					prizeImageUrl: parsedPrizeImage.value,
					lastEditedBy: locals.user.id,
					updatedAt: new Date()
				})
				.where(eq(pathwayWeekContent.id, existing[0].id));
		} else {
			await db.insert(pathwayWeekContent).values({
				pathway: pathwayId,
				weekNumber,
				title,
				content,
				prizeImageUrl: parsedPrizeImage.value,
				lastEditedBy: locals.user.id
			});
		}

		return { success: true };
	},

	togglePublish: async ({ params, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Not authenticated' });
		}

		const pathwayId = params.pathway.toUpperCase() as Pathway;
		const weekNumber = parseInt(params.week);

		const assignment = await db
			.select()
			.from(ambassadorPathway)
			.where(and(eq(ambassadorPathway.userId, locals.user.id), eq(ambassadorPathway.pathway, pathwayId)))
			.limit(1);

		if (assignment.length === 0 && !locals.user.isAdmin) {
			return fail(403, { error: 'Not authorized' });
		}

		const existing = await db
			.select()
			.from(pathwayWeekContent)
			.where(and(eq(pathwayWeekContent.pathway, pathwayId), eq(pathwayWeekContent.weekNumber, weekNumber)))
			.limit(1);

		if (existing.length === 0) {
			return fail(400, { error: 'Save content first before publishing' });
		}

		await db
			.update(pathwayWeekContent)
			.set({
				isPublished: !existing[0].isPublished,
				updatedAt: new Date()
			})
			.where(eq(pathwayWeekContent.id, existing[0].id));

		return { success: true, isPublished: !existing[0].isPublished };
	}
};
