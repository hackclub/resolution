import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { ambassadorPathway, warehouseItem } from '$lib/server/db/schema';
import { and, asc, eq } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { ShopService } from '$lib/server/services/shopService';
import { shopItemSchema } from '$lib/server/validation/schemas';
import { PATHWAY_IDS, type PathwayId } from '$lib/pathways';

async function guard(userId: string, isAdmin: boolean, pathwayParam: string): Promise<PathwayId> {
	const pathwayId = pathwayParam.toUpperCase();
	if (!PATHWAY_IDS.includes(pathwayId as PathwayId)) throw error(404, 'Pathway not found');
	const typed = pathwayId as PathwayId;
	if (!isAdmin) {
		const assignment = await db
			.select({ id: ambassadorPathway.id })
			.from(ambassadorPathway)
			.where(and(eq(ambassadorPathway.userId, userId), eq(ambassadorPathway.pathway, typed)))
			.limit(1);
		if (assignment.length === 0) throw error(403, 'Not assigned to this pathway');
	}
	return typed;
}

export const load: PageServerLoad = async ({ params, parent }) => {
	const { user } = await parent();
	const pathwayId = await guard(user.id, user.isAdmin, params.pathway);

	const [shop, items, warehouseItems] = await Promise.all([
		ShopService.getShopForPathway(pathwayId),
		ShopService.listItems(pathwayId),
		db.select({ id: warehouseItem.id, name: warehouseItem.name, sku: warehouseItem.sku })
			.from(warehouseItem)
			.orderBy(asc(warehouseItem.name))
	]);

	return { pathwayId, shop, items, warehouseItems };
};

function parseShopItemForm(formData: FormData) {
	const raw = {
		name: formData.get('name'),
		description: formData.get('description') ?? '',
		imageUrl: formData.get('imageUrl') || null,
		costCurrency: formData.get('costCurrency'),
		warehouseItemId: formData.get('warehouseItemId') || null,
		isActive: formData.get('isActive') === 'on'
	};
	return shopItemSchema.safeParse(raw);
}

export const actions: Actions = {
	create: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401);
		const pathwayId = await guard(locals.user.id, locals.user.isAdmin, params.pathway!);
		const parsed = parseShopItemForm(await request.formData());
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0]?.message });
		await ShopService.createItem(pathwayId, parsed.data);
		return { success: true };
	},

	update: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401);
		await guard(locals.user.id, locals.user.isAdmin, params.pathway!);
		const formData = await request.formData();
		const itemId = formData.get('itemId') as string;
		if (!itemId) return fail(400, { error: 'Missing item id' });
		const parsed = parseShopItemForm(formData);
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0]?.message });
		await ShopService.updateItem(itemId, parsed.data);
		return { success: true };
	},

	delete: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401);
		await guard(locals.user.id, locals.user.isAdmin, params.pathway!);
		const formData = await request.formData();
		const itemId = formData.get('itemId') as string;
		if (!itemId) return fail(400);
		await ShopService.deleteItem(itemId);
		return { success: true };
	}
};
