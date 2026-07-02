import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { userPathway, ambassadorPathway, reviewerPathway } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { PATHWAY_IDS, type PathwayId } from '$lib/pathways';
import { timed } from '$lib/server/timing';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const [pathways, ambassadorCheck, reviewerCheck] = await timed(
		locals,
		'page-queries',
		() =>
			Promise.all([
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
			]),
		'pathways + ambassador + reviewer (parallel)'
	);

	return {
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
