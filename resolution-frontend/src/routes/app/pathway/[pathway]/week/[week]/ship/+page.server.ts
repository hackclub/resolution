import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { userPathway, pathwayWeekContent } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { redirect, error } from '@sveltejs/kit';
import { PATHWAY_IDS, type PathwayId } from '$lib/pathways';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { user } = await parent();
	const pathwayId = params.pathway.toUpperCase() as PathwayId;
	const weekNumber = parseInt(params.week);

	if (!PATHWAY_IDS.includes(pathwayId)) {
		throw error(404, 'Pathway not found');
	}

	if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 8) {
		throw error(404, 'Invalid week number');
	}

	const userPathwayRecord = await db
		.select()
		.from(userPathway)
		.where(and(eq(userPathway.userId, user.id), eq(userPathway.pathway, pathwayId)))
		.limit(1);

	if (userPathwayRecord.length === 0) {
		throw redirect(302, '/app');
	}

	const content = await db
		.select()
		.from(pathwayWeekContent)
		.where(
			and(
				eq(pathwayWeekContent.pathway, pathwayId),
				eq(pathwayWeekContent.weekNumber, weekNumber),
				eq(pathwayWeekContent.isPublished, true)
			)
		)
		.limit(1);

	if (content.length === 0) {
		throw error(404, 'This week is not yet available');
	}

	return {
		pathwayId,
		weekNumber,
		user: {
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName
		}
	};
};
