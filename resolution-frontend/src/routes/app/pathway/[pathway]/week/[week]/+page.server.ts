import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { userPathway, pathwayWeekContent } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { redirect, error } from '@sveltejs/kit';
import { PATHWAY_IDS, type PathwayId } from '$lib/pathways';

const validPathways = PATHWAY_IDS;
type Pathway = PathwayId;

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) {
		throw error(401, 'Unauthorized');
	}
	const pathwayId = params.pathway.toUpperCase() as Pathway;
	const weekNumber = parseInt(params.week);

	if (!validPathways.includes(pathwayId)) {
		throw error(404, 'Pathway not found');
	}

	if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 8) {
		throw error(404, 'Invalid week number');
	}

	const [userPathwayRecord, content] = await Promise.all([
		db
			.select()
			.from(userPathway)
			.where(and(eq(userPathway.userId, user.id), eq(userPathway.pathway, pathwayId)))
			.limit(1),
		db
			.select()
			.from(pathwayWeekContent)
			.where(and(eq(pathwayWeekContent.pathway, pathwayId), eq(pathwayWeekContent.weekNumber, weekNumber)))
			.limit(1)
	]);

	if (userPathwayRecord.length === 0) {
		throw redirect(302, '/app');
	}

	const weekContent = content[0];
	if (!weekContent || !weekContent.isPublished) {
		throw error(404, 'This week is not yet available');
	}

	return {
		pathwayId,
		weekNumber,
		title: weekContent.title,
		content: weekContent.content,
		isSubmissionsOpen: weekContent.isSubmissionsOpen
	};
};
