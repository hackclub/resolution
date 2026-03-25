import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { ambassadorPathway, pathwayWeekContent } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';

const validPathways = ['PYTHON', 'RUST', 'GAME_DEV', 'HARDWARE', 'DESIGN', 'GENERAL_CODING'] as const;
type Pathway = typeof validPathways[number];

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
