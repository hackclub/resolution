import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { userPathway, pathwayWeekContent } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { redirect, error } from '@sveltejs/kit';

const pathwayCurators: Record<string, string> = {
	PYTHON: 'Hack Club',
	RUST: 'Hack Club',
	GAME_DEV: 'Hack Club',
	HARDWARE: 'Hack Club',
	DESIGN: 'Hack Club',
	GENERAL_CODING: 'Hack Club'
};

const validPathways = ['PYTHON', 'RUST', 'GAME_DEV', 'HARDWARE', 'DESIGN', 'GENERAL_CODING'] as const;

export const load: PageServerLoad = async ({ params, parent }) => {
	const { user } = await parent();
	const pathwayId = params.pathway.toUpperCase();

	if (!validPathways.includes(pathwayId as typeof validPathways[number])) {
		throw error(404, 'Pathway not found');
	}

	const userPathwayRecord = await db
		.select()
		.from(userPathway)
		.where(and(eq(userPathway.userId, user.id), eq(userPathway.pathway, pathwayId as typeof validPathways[number])))
		.limit(1);

	if (userPathwayRecord.length === 0) {
		throw redirect(302, '/app');
	}

	const weekContents = await db
		.select({
			weekNumber: pathwayWeekContent.weekNumber,
			title: pathwayWeekContent.title,
			isPublished: pathwayWeekContent.isPublished
		})
		.from(pathwayWeekContent)
		.where(eq(pathwayWeekContent.pathway, pathwayId as typeof validPathways[number]));

	const publishedWeeks = weekContents.reduce((acc, w) => {
		acc[w.weekNumber] = {
			title: w.title,
			isPublished: w.isPublished
		};
		return acc;
	}, {} as Record<number, { title: string; isPublished: boolean }>);

	return {
		pathwayId,
		curator: pathwayCurators[pathwayId] || 'Unknown',
		publishedWeeks
	};
};
