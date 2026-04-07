import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { userPathway } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import { ShopService } from '$lib/server/services/shopService';
import { PATHWAY_IDS, type PathwayId } from '$lib/pathways';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { user } = await parent();
	const pathwayId = params.pathway.toUpperCase();
	if (!PATHWAY_IDS.includes(pathwayId as PathwayId)) {
		throw error(404, 'Pathway not found');
	}
	const typed = pathwayId as PathwayId;

	const enrolled = await db.query.userPathway.findFirst({
		where: and(eq(userPathway.userId, user.id), eq(userPathway.pathway, typed))
	});
	if (!enrolled) throw redirect(302, '/app');

	const [shop, items] = await Promise.all([
		ShopService.getShopForPathway(typed),
		ShopService.listItems(typed, { activeOnly: true })
	]);

	return {
		pathwayId,
		shop,
		items,
		balance: enrolled.balance ?? 0
	};
};
