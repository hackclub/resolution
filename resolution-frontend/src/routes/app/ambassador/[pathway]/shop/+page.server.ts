import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { pathwayShop, shopItem, shopOrder } from '$lib/server/db/schema';
import { and, desc, eq, notInArray } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ parent }) => {
	const { pathwayId } = await parent();

	const shop = await db.query.pathwayShop.findFirst({
		where: eq(pathwayShop.pathway, pathwayId)
	});
	if (!shop) throw error(404, 'Shop not found for this pathway');

	const items = await db
		.select()
		.from(shopItem)
		.where(eq(shopItem.pathway, pathwayId))
		.orderBy(desc(shopItem.createdAt));

	const totalOrders = await db.$count(shopOrder, eq(shopOrder.pathway, pathwayId));
	const awaitingFufillment = await db.$count(
		shopOrder,
		and(
			eq(shopOrder.pathway, pathwayId),
			notInArray(shopOrder.status, ['FULFILLED', 'CANCELED'])
		)
	);

	return {
		shop: {
			isEnabled: shop.isEnabled,
			currencyName: shop.currencyName,
			currencyNamePlural: shop.currencyNamePlural
		},
		items,
		totalOrders,
		awaitingFufillment
	};
};
