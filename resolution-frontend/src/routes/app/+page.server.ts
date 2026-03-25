import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { userPathway, ambassadorPathway, reviewerPathway } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { PATHWAY_IDS, type PathwayId } from '$lib/pathways';

export const load: PageServerLoad = async ({ parent }) => {
	const { user, season, enrollment } = await parent();

	const [pathways, ambassadorCheck, reviewerCheck] = await Promise.all([
		db
			.select({ pathway: userPathway.pathway })
			.from(userPathway)
			.where(eq(userPathway.userId, user.id)),
		db
			.select({ userId: ambassadorPathway.userId })
			.from(ambassadorPathway)
			.where(eq(ambassadorPathway.userId, user.id))
			.limit(1),
		db
			.select({ userId: reviewerPathway.userId })
			.from(reviewerPathway)
			.where(eq(reviewerPathway.userId, user.id))
			.limit(1)
	]);

	return {
		user,
		season,
		enrollment,
		selectedPathways: pathways.map((p) => p.pathway),
		isAmbassador: ambassadorCheck.length > 0,
		isReviewer: reviewerCheck.length > 0
	};
};

export const actions: Actions = {
	savePathways: async ({ request, locals }) => {
		const session = locals.session;
		const user = locals.user;

		if (!session || !user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const pathwaysJson = formData.get('pathways');

		if (!pathwaysJson || typeof pathwaysJson !== 'string') {
			return fail(400, { error: 'Invalid pathways' });
		}

		const parsed = JSON.parse(pathwaysJson) as string[];

		if (!parsed.every((p) => PATHWAY_IDS.includes(p))) {
			return fail(400, { error: 'Invalid pathway selected' });
		}

		const pathways = parsed as PathwayId[];

		await db.delete(userPathway).where(eq(userPathway.userId, user.id));

		if (pathways.length > 0) {
			await db.insert(userPathway).values(
				pathways.map((pathway) => ({
					userId: user.id,
					pathway
				}))
			);
		}

		return { success: true };
	}
};
