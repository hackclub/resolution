import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { reviewerPathway, ambassadorPathway } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { getActiveSeason } from '$lib/server/season';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const assignments = await db
		.select()
		.from(reviewerPathway)
		.where(eq(reviewerPathway.userId, user.id));

	if (assignments.length === 0 && !user.isAdmin) {
		throw error(403, 'You are not a reviewer');
	}

	const [ambassadorRows, activeSeason] = await Promise.all([
		db
			.select({ userId: ambassadorPathway.userId })
			.from(ambassadorPathway)
			.where(eq(ambassadorPathway.userId, user.id))
			.limit(1),
		getActiveSeason()
	]);

	return {
		assignments: assignments.map(a => a.pathway),
		isAdmin: user.isAdmin,
		isAmbassador: ambassadorRows.length > 0,
		totalWeeks: activeSeason?.totalWeeks ?? 8
	};
};
