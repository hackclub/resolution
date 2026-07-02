import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { warehouseItem, warehouseOrder, warehouseOrderTag, ambassadorPathway } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	const ambassadorCheck = await db
		.select({ userId: ambassadorPathway.userId })
		.from(ambassadorPathway)
		.where(eq(ambassadorPathway.userId, user.id))
		.limit(1);

	const isAmbassador = ambassadorCheck.length > 0;

	if (!user.isAdmin && !isAmbassador) {
		throw error(403, 'Access denied');
	}

	const [items, orders, allTags] = await Promise.all([
		db
			.select()
			.from(warehouseItem)
			.orderBy(warehouseItem.name),
		db.query.warehouseOrder.findMany({
			where: user.isAdmin ? undefined : eq(warehouseOrder.createdById, user.id),
			with: {
				createdBy: {
					columns: {
						id: true,
						firstName: true,
						lastName: true,
						email: true
					}
				},
				items: {
					with: {
						warehouseItem: true
					}
				},
				tags: true
			},
			orderBy: [desc(warehouseOrder.createdAt)]
		}),
		db
			.selectDistinct({ tag: warehouseOrderTag.tag })
			.from(warehouseOrderTag)
			.orderBy(warehouseOrderTag.tag)
	]);

	return {
		items,
		orders,
		allTags: allTags.map((t) => t.tag)
	};
};
