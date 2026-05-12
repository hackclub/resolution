import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { warehouseOrder, warehouseOrderTag } from '$lib/server/db/schema';
import { ne, desc, count } from 'drizzle-orm';

const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ parent, url }) => {
	await parent();

	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
	const offset = (page - 1) * PAGE_SIZE;

	const [orders, [{ total }]] = await Promise.all([
		db.query.warehouseOrder.findMany({
			where: ne(warehouseOrder.status, 'DRAFT'),
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
			orderBy: [desc(warehouseOrder.createdAt)],
			limit: PAGE_SIZE,
			offset
		}),
		db.select({ total: count() }).from(warehouseOrder).where(ne(warehouseOrder.status, 'DRAFT'))
	]);

	const allTags = await db
		.selectDistinct({ tag: warehouseOrderTag.tag })
		.from(warehouseOrderTag)
		.orderBy(warehouseOrderTag.tag);

	return {
		orders,
		allTags: allTags.map((t) => t.tag),
		page,
		pageSize: PAGE_SIZE,
		totalOrders: total
	};
};
