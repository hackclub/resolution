import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { warehouseOrder, warehouseOrderTag, ambassadorPathway } from '$lib/server/db/schema';
import { eq, ne, desc } from 'drizzle-orm';
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

	const orders = await db.query.warehouseOrder.findMany({
		where: ne(warehouseOrder.status, 'DRAFT'),
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
		orders,
		allTags: allTags.map((t) => t.tag)
	};
};
