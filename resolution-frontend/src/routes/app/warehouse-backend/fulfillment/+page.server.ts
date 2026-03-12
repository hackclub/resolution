import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { warehouseOrder, warehouseOrderTag } from '$lib/server/db/schema';
import { ne, desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
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
