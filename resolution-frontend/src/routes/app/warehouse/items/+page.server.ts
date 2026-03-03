import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { warehouseItem, warehouseCategory, ambassadorPathway } from '$lib/server/db/schema';
import { eq, desc, asc } from 'drizzle-orm';
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
		.orderBy(desc(warehouseItem.createdAt));

	const categories = await db
		.select()
		.from(warehouseCategory)
		.orderBy(asc(warehouseCategory.sortOrder), asc(warehouseCategory.name));

	return {
		items,
		categories
	};
};
