import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { warehouseItem, warehouseCategory } from '$lib/server/db/schema';
import { eq, asc, desc } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const [categories, items] = await Promise.all([
		db.select().from(warehouseCategory).orderBy(asc(warehouseCategory.sortOrder)),
		db.select().from(warehouseItem).orderBy(desc(warehouseItem.createdAt))
	]);

	return { categories, items };
};

export const actions: Actions = {
	createCategory: async ({ request }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const sortOrder = parseInt(formData.get('sortOrder') as string);

		if (!name) {
			return fail(400, { error: 'Category name is required' });
		}

		await db.insert(warehouseCategory).values({
			name,
			sortOrder: isNaN(sortOrder) ? 0 : sortOrder
		});

		return { success: true };
	},

	updateCategory: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		const name = formData.get('name') as string;
		const sortOrder = parseInt(formData.get('sortOrder') as string);

		if (!id) {
			return fail(400, { error: 'Category ID is required' });
		}
		if (!name) {
			return fail(400, { error: 'Category name is required' });
		}

		await db
			.update(warehouseCategory)
			.set({
				name,
				sortOrder: isNaN(sortOrder) ? 0 : sortOrder
			})
			.where(eq(warehouseCategory.id, id));

		return { success: true };
	},

	deleteCategory: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: 'Category ID is required' });
		}

		await db.delete(warehouseCategory).where(eq(warehouseCategory.id, id));

		return { success: true };
	},

	createItem: async ({ request }) => {
		const formData = await request.formData();
		const name = formData.get('name') as string;
		const sku = formData.get('sku') as string;
		const categoryId = formData.get('categoryId') as string | null;
		const sizing = formData.get('sizing') as string | null;
		const packageType = formData.get('packageType') as string;
		const lengthIn = parseFloat(formData.get('lengthIn') as string);
		const widthIn = parseFloat(formData.get('widthIn') as string);
		const heightIn = parseFloat(formData.get('heightIn') as string);
		const weightGrams = parseFloat(formData.get('weightGrams') as string);
		const costDollars = parseFloat(formData.get('costDollars') as string);
		const hsCode = formData.get('hsCode') as string;
		const quantity = parseInt(formData.get('quantity') as string);
		const imageUrl = formData.get('imageUrl') as string | null;

		if (!name) {
			return fail(400, { error: 'Item name is required' });
		}
		if (!sku) {
			return fail(400, { error: 'SKU is required' });
		}
		if (isNaN(lengthIn) || isNaN(widthIn) || isNaN(heightIn)) {
			return fail(400, { error: 'Valid dimensions are required' });
		}
		if (isNaN(weightGrams)) {
			return fail(400, { error: 'Valid weight is required' });
		}
		if (isNaN(costDollars)) {
			return fail(400, { error: 'Valid cost is required' });
		}
		if (!hsCode) {
			return fail(400, { error: 'HS Code is required' });
		}

		await db.insert(warehouseItem).values({
			name,
			sku,
			categoryId: categoryId || null,
			sizing: sizing || null,
			packageType: packageType || 'box',
			lengthIn,
			widthIn,
			heightIn,
			weightGrams,
			costCents: Math.round(costDollars * 100),
			hsCode,
			quantity: isNaN(quantity) ? 0 : quantity,
			imageUrl: imageUrl || null
		});

		return { success: true };
	},

	updateItem: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		const name = formData.get('name') as string;
		const sku = formData.get('sku') as string;
		const categoryId = formData.get('categoryId') as string | null;
		const sizing = formData.get('sizing') as string | null;
		const packageType = formData.get('packageType') as string;
		const lengthIn = parseFloat(formData.get('lengthIn') as string);
		const widthIn = parseFloat(formData.get('widthIn') as string);
		const heightIn = parseFloat(formData.get('heightIn') as string);
		const weightGrams = parseFloat(formData.get('weightGrams') as string);
		const costDollars = parseFloat(formData.get('costDollars') as string);
		const hsCode = formData.get('hsCode') as string;
		const quantity = parseInt(formData.get('quantity') as string);
		const imageUrl = formData.get('imageUrl') as string | null;

		if (!id) {
			return fail(400, { error: 'Item ID is required' });
		}
		if (!name) {
			return fail(400, { error: 'Item name is required' });
		}
		if (!sku) {
			return fail(400, { error: 'SKU is required' });
		}
		if (isNaN(lengthIn) || isNaN(widthIn) || isNaN(heightIn)) {
			return fail(400, { error: 'Valid dimensions are required' });
		}
		if (isNaN(weightGrams)) {
			return fail(400, { error: 'Valid weight is required' });
		}
		if (isNaN(costDollars)) {
			return fail(400, { error: 'Valid cost is required' });
		}
		if (!hsCode) {
			return fail(400, { error: 'HS Code is required' });
		}

		await db
			.update(warehouseItem)
			.set({
				name,
				sku,
				categoryId: categoryId || null,
				sizing: sizing || null,
				packageType: packageType || 'box',
				lengthIn,
				widthIn,
				heightIn,
				weightGrams,
				costCents: Math.round(costDollars * 100),
				hsCode,
				quantity: isNaN(quantity) ? 0 : quantity,
				imageUrl: imageUrl || null,
				updatedAt: new Date()
			})
			.where(eq(warehouseItem.id, id));

		return { success: true };
	},

	deleteItem: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: 'Item ID is required' });
		}

		await db.delete(warehouseItem).where(eq(warehouseItem.id, id));

		return { success: true };
	}
};
