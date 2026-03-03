import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { userPathway, ambassadorPathway } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ parent }) => {
	const { user, season, enrollment } = await parent();

	const [pathways, ambassadorCheck] = await Promise.all([
		db
			.select({ pathway: userPathway.pathway })
			.from(userPathway)
			.where(eq(userPathway.userId, user.id)),
		db
			.select({ userId: ambassadorPathway.userId })
			.from(ambassadorPathway)
			.where(eq(ambassadorPathway.userId, user.id))
			.limit(1)
	]);

	return {
		user,
		season,
		enrollment,
		selectedPathways: pathways.map((p) => p.pathway),
		isAmbassador: ambassadorCheck.length > 0
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

		const pathways = JSON.parse(pathwaysJson) as string[];

		if (pathways.length > 3) {
			return fail(400, { error: 'Maximum 3 pathways allowed' });
		}

		const validPathways = ['PYTHON', 'RUST', 'GAME_DEV', 'HARDWARE', 'DESIGN', 'GENERAL_CODING'];
		if (!pathways.every((p) => validPathways.includes(p))) {
			return fail(400, { error: 'Invalid pathway selected' });
		}

		await db.delete(userPathway).where(eq(userPathway.userId, user.id));

		if (pathways.length > 0) {
			await db.insert(userPathway).values(
				pathways.map((pathway) => ({
					userId: user.id,
					pathway: pathway as 'PYTHON' | 'RUST' | 'GAME_DEV' | 'HARDWARE' | 'DESIGN' | 'GENERAL_CODING'
				}))
			);
		}

		return { success: true };
	}
};
