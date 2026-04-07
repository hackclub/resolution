import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { userPathway } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { ShopService } from '$lib/server/services/shopService';
import { shopPurchaseSchema } from '$lib/server/validation/schemas';
import { PATHWAY_IDS, type PathwayId } from '$lib/pathways';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { user } = await parent();
	const pathwayId = params.pathway.toUpperCase();
	if (!PATHWAY_IDS.includes(pathwayId as PathwayId)) throw error(404);
	const typed = pathwayId as PathwayId;

	const enrolled = await db.query.userPathway.findFirst({
		where: and(eq(userPathway.userId, user.id), eq(userPathway.pathway, typed))
	});
	if (!enrolled) throw redirect(302, '/app');

	const item = await ShopService.getItem(params.itemId);
	if (!item || item.pathway !== typed || !item.isActive) throw error(404, 'Item not found');

	const shop = await ShopService.getShopForPathway(typed);
	return { pathwayId, item, shop, balance: enrolled.balance ?? 0 };
};

export const actions: Actions = {
	purchase: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401, { error: 'Not logged in' });
		const pathwayId = params.pathway!.toUpperCase() as PathwayId;
		if (!PATHWAY_IDS.includes(pathwayId)) return fail(404, { error: 'Bad pathway' });

		const formData = await request.formData();
		const parsed = shopPurchaseSchema.safeParse(Object.fromEntries(formData));
		if (!parsed.success) {
			return fail(400, { error: parsed.error.issues[0]?.message ?? 'Invalid input' });
		}

		try {
			const order = await ShopService.purchaseItem(
				locals.user.id,
				pathwayId,
				parsed.data.itemId,
				parsed.data.quantity,
				parsed.data
			);
			throw redirect(303, `/app/pathway/${params.pathway}/shop/orders?ok=${order.id}`);
		} catch (e) {
			if (e instanceof Response) throw e; // redirect
			const msg = e instanceof Error ? e.message : 'Purchase failed';
			return fail(400, { error: msg });
		}
	}
};
