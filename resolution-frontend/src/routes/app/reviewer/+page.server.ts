import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { reviewerPathway } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	const assignments = await db
		.select()
		.from(reviewerPathway)
		.where(eq(reviewerPathway.userId, user.id));

	if (assignments.length === 0 && !user.isAdmin) {
		throw error(403, 'You are not a reviewer');
	}

	return {
		assignments: assignments.map(a => a.pathway),
		isAdmin: user.isAdmin
	};
};
