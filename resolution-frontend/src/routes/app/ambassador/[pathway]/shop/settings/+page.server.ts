import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { ambassadorPathway } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { ShopService } from '$lib/server/services/shopService';
import { shopSettingsSchema } from '$lib/server/validation/schemas';
import { PATHWAY_IDS, type PathwayId } from '$lib/pathways';

async function guard(userId: string, isAdmin: boolean, pathwayParam: string): Promise<PathwayId> {
	const pathwayId = pathwayParam.toUpperCase();
	if (!PATHWAY_IDS.includes(pathwayId as PathwayId)) throw error(404);
	const typed = pathwayId as PathwayId;
	if (!isAdmin) {
		const a = await db
			.select({ id: ambassadorPathway.id })
			.from(ambassadorPathway)
			.where(and(eq(ambassadorPathway.userId, userId), eq(ambassadorPathway.pathway, typed)))
			.limit(1);
		if (a.length === 0) throw error(403);
	}
	return typed;
}

export const load: PageServerLoad = async ({ params, parent }) => {
	const { user } = await parent();
	const pathwayId = await guard(user.id, user.isAdmin, params.pathway);
	const shop = await ShopService.getShopForPathway(pathwayId);
	return { pathwayId, shop };
};

export const actions: Actions = {
	save: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401);
		const pathwayId = await guard(locals.user.id, locals.user.isAdmin, params.pathway!);
		const formData = await request.formData();
		const parsed = shopSettingsSchema.safeParse({
			currencyName: formData.get('currencyName'),
			currencyIconUrl: formData.get('currencyIconUrl') || null
		});
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0]?.message });
		await ShopService.updateShopSettings(pathwayId, parsed.data);
		return { success: true };
	}
};
