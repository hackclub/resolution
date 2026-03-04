import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { warehouseItem, warehouseOrder, warehouseOrderTag, ambassadorPathway } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	const ambassadorCheck = await db
		.select({ userId: ambassadorPathway.userId })
		.from(ambassadorPathway)
		.where(eq(ambassadorPathway.userId, user.id))
		.limit(1);

	const isAmbassador = ambassadorCheck.length > 0;

	if (!user.isAdmin && !isAmbassador) {
		throw error(403, 'Access denied');
	}

	const items = await db
		.select()
		.from(warehouseItem)
		.orderBy(warehouseItem.name);

	const orders = await db.query.warehouseOrder.findMany({
		where: eq(warehouseOrder.createdById, user.id),
		with: {
			createdBy: true,
			items: {
				with: {
					warehouseItem: true
				}
			},
			tags: true
		},
		orderBy: [desc(warehouseOrder.createdAt)]
	});

	const allTags = await db
		.selectDistinct({ tag: warehouseOrderTag.tag })
		.from(warehouseOrderTag)
		.orderBy(warehouseOrderTag.tag);

	return {
		items,
		orders,
		allTags: allTags.map((t) => t.tag)
	};
};
