import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { ShopService } from '$lib/server/services/shopService';
import { PATHWAY_IDS, type PathwayId } from '$lib/pathways';

export const load: PageServerLoad = async ({ params, parent }) => {
	const { user } = await parent();
	const pathwayId = params.pathway.toUpperCase();
	if (!PATHWAY_IDS.includes(pathwayId as PathwayId)) throw error(404);
	const typed = pathwayId as PathwayId;

	const [orders, shop] = await Promise.all([
		ShopService.listOrdersForUser(user.id, typed),
		ShopService.getShopForPathway(typed)
	]);

	return { pathwayId, orders, shop };
};
