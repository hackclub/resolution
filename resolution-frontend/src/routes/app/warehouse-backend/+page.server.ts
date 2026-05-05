import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { warehouseItem, warehouseCategory } from '$lib/server/db/schema';
import { eq, asc, desc } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';

const warehouseItemFormSchema = z.object({
	name: z.string().min(1, 'Item name is required'),
	sku: z.string().min(1, 'SKU is required'),
	categoryId: z.string().nullable(),
	sizing: z.string().nullable(),
	packageType: z.string().default('box'),
	lengthIn: z.coerce.number().positive('Valid dimensions are required'),
	widthIn: z.coerce.number().positive('Valid dimensions are required'),
	heightIn: z.coerce.number().nonnegative('Valid dimensions are required'),
	weightGrams: z.coerce.number().positive('Valid weight is required'),
	costDollars: z.coerce.number().nonnegative('Valid cost is required'),
	hsCode: z.string().min(1, 'HS Code is required'),
	quantity: z.coerce.number().int().nonnegative().default(0),
	imageUrl: z.string().nullable()
});

function requireAdmin(locals: App.Locals) {
	if (!locals.user || !locals.session) {
		throw error(401, 'Unauthorized');
	}
	if (!locals.user.isAdmin) {
		throw error(403, 'Access denied - admin only');
	}
}

export const load: PageServerLoad = async () => {
	const [categories, items] = await Promise.all([
		db.select().from(warehouseCategory).orderBy(asc(warehouseCategory.sortOrder)),
		db.select().from(warehouseItem).orderBy(desc(warehouseItem.createdAt))
	]);

	return { categories, items };
};

export const actions: Actions = {
	createCategory: async ({ request, locals }) => {
		requireAdmin(locals);
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

	updateCategory: async ({ request, locals }) => {
		requireAdmin(locals);
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

		const existing = await db.select({ id: warehouseCategory.id }).from(warehouseCategory).where(eq(warehouseCategory.id, id)).limit(1);
		if (existing.length === 0) {
			return fail(404, { error: 'Category not found' });
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

	deleteCategory: async ({ request, locals }) => {
		requireAdmin(locals);
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: 'Category ID is required' });
		}

		const existing = await db.select({ id: warehouseCategory.id }).from(warehouseCategory).where(eq(warehouseCategory.id, id)).limit(1);
		if (existing.length === 0) {
			return fail(404, { error: 'Category not found' });
		}

		await db.delete(warehouseCategory).where(eq(warehouseCategory.id, id));

		return { success: true };
	},

	createItem: async ({ request, locals }) => {
		requireAdmin(locals);
		const formData = await request.formData();
		const result = warehouseItemFormSchema.safeParse({
			name: formData.get('name'),
			sku: formData.get('sku'),
			categoryId: formData.get('categoryId') || null,
			sizing: formData.get('sizing') || null,
			packageType: formData.get('packageType'),
			lengthIn: formData.get('lengthIn'),
			widthIn: formData.get('widthIn'),
			heightIn: formData.get('heightIn'),
			weightGrams: formData.get('weightGrams'),
			costDollars: formData.get('costDollars'),
			hsCode: formData.get('hsCode'),
			quantity: formData.get('quantity'),
			imageUrl: formData.get('imageUrl') || null
		});

		if (!result.success) {
			return fail(400, { error: result.error.issues[0].message });
		}

		const { costDollars, ...rest } = result.data;
		await db.insert(warehouseItem).values({
			...rest,
			costCents: Math.round(costDollars * 100)
		});

		return { success: true };
	},

	updateItem: async ({ request, locals }) => {
		requireAdmin(locals);
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: 'Item ID is required' });
		}

		const existing = await db.select({ id: warehouseItem.id }).from(warehouseItem).where(eq(warehouseItem.id, id)).limit(1);
		if (existing.length === 0) {
			return fail(404, { error: 'Item not found' });
		}

		const result = warehouseItemFormSchema.safeParse({
			name: formData.get('name'),
			sku: formData.get('sku'),
			categoryId: formData.get('categoryId') || null,
			sizing: formData.get('sizing') || null,
			packageType: formData.get('packageType'),
			lengthIn: formData.get('lengthIn'),
			widthIn: formData.get('widthIn'),
			heightIn: formData.get('heightIn'),
			weightGrams: formData.get('weightGrams'),
			costDollars: formData.get('costDollars'),
			hsCode: formData.get('hsCode'),
			quantity: formData.get('quantity'),
			imageUrl: formData.get('imageUrl') || null
		});

		if (!result.success) {
			return fail(400, { error: result.error.issues[0].message });
		}

		const { costDollars, ...rest } = result.data;
		await db
			.update(warehouseItem)
			.set({
				...rest,
				costCents: Math.round(costDollars * 100),
				updatedAt: new Date()
			})
			.where(eq(warehouseItem.id, id));

		return { success: true };
	},

	deleteItem: async ({ request, locals }) => {
		requireAdmin(locals);
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: 'Item ID is required' });
		}

		const existing = await db.select({ id: warehouseItem.id }).from(warehouseItem).where(eq(warehouseItem.id, id)).limit(1);
		if (existing.length === 0) {
			return fail(404, { error: 'Item not found' });
		}

		await db.delete(warehouseItem).where(eq(warehouseItem.id, id));

		return { success: true };
	}
};
