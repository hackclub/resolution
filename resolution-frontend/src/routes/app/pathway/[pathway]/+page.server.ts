import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { userPathway, pathwayWeekContent } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { redirect, error } from '@sveltejs/kit';
import { PATHWAY_IDS, type PathwayId } from '$lib/pathways';

const pathwayCurators: Record<string, string> = Object.fromEntries(
	PATHWAY_IDS.map((id) => [id, 'Hack Club'])
);

const validPathways = PATHWAY_IDS;

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user;
	if (!user) {
		throw error(401, 'Unauthorized');
	}
	const pathwayId = params.pathway.toUpperCase();

	if (!validPathways.includes(pathwayId)) {
		throw error(404, 'Pathway not found');
	}

	const typedPathwayId = pathwayId as PathwayId;

	const [userPathwayRecord, weekContents] = await Promise.all([
		db
			.select()
			.from(userPathway)
			.where(and(eq(userPathway.userId, user.id), eq(userPathway.pathway, typedPathwayId)))
			.limit(1),
		db
			.select({
				weekNumber: pathwayWeekContent.weekNumber,
				title: pathwayWeekContent.title,
				prizeImageUrl: pathwayWeekContent.prizeImageUrl,
				isPublished: pathwayWeekContent.isPublished
			})
			.from(pathwayWeekContent)
			.where(eq(pathwayWeekContent.pathway, typedPathwayId))
	]);

	if (userPathwayRecord.length === 0) {
		throw redirect(302, '/app');
	}

	const publishedWeeks = weekContents.reduce((acc, w) => {
		acc[w.weekNumber] = {
			title: w.title,
			prizeImageUrl: w.prizeImageUrl,
			isPublished: w.isPublished
		};
		return acc;
	}, {} as Record<number, { title: string; prizeImageUrl: string | null; isPublished: boolean }>);

	return {
		pathwayId,
		curator: pathwayCurators[pathwayId] || 'Unknown',
		publishedWeeks
	};
};
