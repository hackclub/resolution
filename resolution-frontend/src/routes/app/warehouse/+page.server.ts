import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { warehouseItem, ambassadorPathway } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';

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

	return {
		items,
		isAdmin: user.isAdmin
	};
};

export const actions: Actions = {
	addItem: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) {
			return fail(403, { error: 'Only admins can add items' });
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const sku = formData.get('sku') as string;
		const sizing = formData.get('sizing') as string | null;
		const weightOz = parseFloat(formData.get('weightOz') as string);
		const costCents = Math.round(parseFloat(formData.get('cost') as string) * 100);
		const quantity = parseInt(formData.get('quantity') as string) || 0;

		if (!name || !sku || isNaN(weightOz) || isNaN(costCents)) {
			return fail(400, { error: 'Name, SKU, weight, and cost are required' });
		}

		try {
			await db.insert(warehouseItem).values({
				name,
				sku,
				sizing: sizing || null,
				weightOz,
				costCents,
				quantity
			});
		} catch {
			return fail(400, { error: 'SKU already exists' });
		}

		return { success: true };
	},

	deleteItem: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) {
			return fail(403, { error: 'Only admins can delete items' });
		}

		const formData = await request.formData();
		const itemId = formData.get('itemId') as string;

		if (!itemId) {
			return fail(400, { error: 'Item ID required' });
		}

		await db.delete(warehouseItem).where(eq(warehouseItem.id, itemId));

		return { success: true };
	}
};
