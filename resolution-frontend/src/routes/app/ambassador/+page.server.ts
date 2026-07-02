import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { ambassadorPathway, pathwayWeekContent } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const [assignments, weekContents] = await Promise.all([
		db
			.select()
			.from(ambassadorPathway)
			.where(eq(ambassadorPathway.userId, user.id)),
		db.select().from(pathwayWeekContent)
	]);

	if (assignments.length === 0 && !user.isAdmin) {
		throw error(403, 'You are not an ambassador');
	}

	const contentByPathway = weekContents.reduce((acc, c) => {
		if (!acc[c.pathway]) acc[c.pathway] = {};
		acc[c.pathway][c.weekNumber] = {
			title: c.title,
			isPublished: c.isPublished
		};
		return acc;
	}, {} as Record<string, Record<number, { title: string; isPublished: boolean }>>);

	return {
		assignments: assignments.map(a => a.pathway),
		contentByPathway
	};
};
