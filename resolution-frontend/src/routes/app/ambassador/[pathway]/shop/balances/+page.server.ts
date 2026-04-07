import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { ambassadorPathway, user, userPathway } from '$lib/server/db/schema';
import { and, asc, eq } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { ShopService } from '$lib/server/services/shopService';
import { balanceAdjustSchema } from '$lib/server/validation/schemas';
import { PATHWAY_IDS, type PathwayId } from '$lib/pathways';

async function guard(userId: string, isAdmin: boolean, pathwayParam: string): Promise<PathwayId> {
	const p = pathwayParam.toUpperCase();
	if (!PATHWAY_IDS.includes(p as PathwayId)) throw error(404);
	const typed = p as PathwayId;
	if (!isAdmin) {
		const a = await db.select({ id: ambassadorPathway.id }).from(ambassadorPathway)
			.where(and(eq(ambassadorPathway.userId, userId), eq(ambassadorPathway.pathway, typed))).limit(1);
		if (a.length === 0) throw error(403);
	}
	return typed;
}

export const load: PageServerLoad = async ({ params, parent }) => {
	const { user: u } = await parent();
	const pathwayId = await guard(u.id, u.isAdmin, params.pathway);
	const shop = await ShopService.getShopForPathway(pathwayId);

	const rows = await db
		.select({
			userId: userPathway.userId,
			balance: userPathway.balance,
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email
		})
		.from(userPathway)
		.innerJoin(user, eq(user.id, userPathway.userId))
		.where(eq(userPathway.pathway, pathwayId))
		.orderBy(asc(user.firstName));

	return { pathwayId, shop, participants: rows };
};

export const actions: Actions = {
	setBalance: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401);
		const pathwayId = await guard(locals.user.id, locals.user.isAdmin, params.pathway!);
		const formData = await request.formData();
		const parsed = balanceAdjustSchema.safeParse({
			userId: formData.get('userId'),
			value: formData.get('value')
		});
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0]?.message });
		try {
			await ShopService.setBalance(parsed.data.userId, pathwayId, parsed.data.value);
			return { success: true };
		} catch (e) {
			return fail(400, { error: e instanceof Error ? e.message : 'Failed' });
		}
	}
};
