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

export const load: PageServerLoad = async ({ params, parent }) => {
	const { user } = await parent();
	const pathwayId = params.pathway.toUpperCase();

	if (!validPathways.includes(pathwayId)) {
		throw error(404, 'Pathway not found');
	}

	const typedPathwayId = pathwayId as PathwayId;

	const userPathwayRecord = await db
		.select()
		.from(userPathway)
		.where(and(eq(userPathway.userId, user.id), eq(userPathway.pathway, typedPathwayId)))
		.limit(1);

	if (userPathwayRecord.length === 0) {
		throw redirect(302, '/app');
	}

	const weekContents = await db
		.select({
			weekNumber: pathwayWeekContent.weekNumber,
			title: pathwayWeekContent.title,
			prizeImageUrl: pathwayWeekContent.prizeImageUrl,
			isPublished: pathwayWeekContent.isPublished
		})
		.from(pathwayWeekContent)
		.where(eq(pathwayWeekContent.pathway, typedPathwayId));

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
