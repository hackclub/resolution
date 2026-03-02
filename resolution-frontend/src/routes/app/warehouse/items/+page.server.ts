import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { warehouseItem, warehouseCategory, ambassadorPathway } from '$lib/server/db/schema';
import { eq, desc, asc } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

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
		categories,
		isAdmin: user.isAdmin
	};
};

export const actions: Actions = {
	addCategory: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) {
			return fail(403, { error: 'Only admins can add categories' });
		}

		const formData = await request.formData();
		const name = (formData.get('categoryName') as string)?.trim();

		if (!name) {
			return fail(400, { error: 'Category name is required' });
		}

		await db.insert(warehouseCategory).values({ name });

		return { success: true };
	},

	editCategory: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) {
			return fail(403, { error: 'Only admins can edit categories' });
		}

		const formData = await request.formData();
		const categoryId = formData.get('categoryId') as string;
		const name = (formData.get('categoryName') as string)?.trim();
		const sortOrder = parseInt(formData.get('sortOrder') as string);

		if (!categoryId) {
			return fail(400, { error: 'Category ID required' });
		}

		const updateData: Record<string, unknown> = {};
		if (name) updateData.name = name;
		if (!isNaN(sortOrder)) updateData.sortOrder = sortOrder;

		if (Object.keys(updateData).length === 0) {
			return fail(400, { error: 'Nothing to update' });
		}

		await db.update(warehouseCategory).set(updateData).where(eq(warehouseCategory.id, categoryId));

		return { success: true };
	},

	deleteCategory: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) {
			return fail(403, { error: 'Only admins can delete categories' });
		}

		const formData = await request.formData();
		const categoryId = formData.get('categoryId') as string;

		if (!categoryId) {
			return fail(400, { error: 'Category ID required' });
		}

		await db.delete(warehouseCategory).where(eq(warehouseCategory.id, categoryId));

		return { success: true };
	},

	addItem: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) {
			return fail(403, { error: 'Only admins can add items' });
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const sku = formData.get('sku') as string;
		const categoryId = formData.get('categoryId') as string | null;
		const sizing = formData.get('sizing') as string | null;
		const lengthIn = parseFloat(formData.get('lengthIn') as string);
		const widthIn = parseFloat(formData.get('widthIn') as string);
		const heightIn = parseFloat(formData.get('heightIn') as string);
		const weightGrams = parseFloat(formData.get('weightGrams') as string);
		const costCents = Math.round(parseFloat(formData.get('cost') as string) * 100);
		const quantity = parseInt(formData.get('quantity') as string) || 0;
		const imageFile = formData.get('image') as File | null;

		if (!name || !sku || isNaN(lengthIn) || isNaN(widthIn) || isNaN(heightIn) || isNaN(weightGrams) || isNaN(costCents)) {
			return fail(400, { error: 'Name, SKU, dimensions, weight, and cost are required' });
		}

		let imageUrl: string | null = null;

		if (imageFile && imageFile.size > 0) {
			if (!ALLOWED_TYPES.includes(imageFile.type)) {
				return fail(400, { error: 'Image must be JPEG, PNG, GIF, or WebP' });
			}
			if (imageFile.size > MAX_SIZE) {
				return fail(400, { error: 'Image must be under 5MB' });
			}

			const cdnKey = env.HACK_CLUB_CDN_API_KEY;
			if (!cdnKey) {
				return fail(500, { error: 'CDN not configured' });
			}

			const uploadForm = new FormData();
			uploadForm.append('file', imageFile);

			const cdnResponse = await fetch('https://cdn.hackclub.com/api/v4/upload', {
				method: 'POST',
				headers: { 'Authorization': `Bearer ${cdnKey}` },
				body: uploadForm
			});

			if (!cdnResponse.ok) {
				const cdnError = await cdnResponse.json().catch(() => ({}));
				return fail(500, { error: cdnError.error || 'Failed to upload image' });
			}

			const cdnResult = await cdnResponse.json();
			imageUrl = cdnResult.url;
		}

		try {
			await db.insert(warehouseItem).values({
				name,
				sku,
				categoryId: categoryId || null,
				sizing: sizing || null,
				lengthIn,
				widthIn,
				heightIn,
				weightGrams,
				costCents,
				quantity,
				imageUrl
			});
		} catch {
			return fail(400, { error: 'SKU already exists' });
		}

		return { success: true };
	},

	editItem: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) {
			return fail(403, { error: 'Only admins can edit items' });
		}

		const formData = await request.formData();
		const itemId = formData.get('itemId') as string;
		const name = formData.get('name') as string;
		const sku = formData.get('sku') as string;
		const categoryId = formData.get('categoryId') as string | null;
		const sizing = formData.get('sizing') as string | null;
		const lengthIn = parseFloat(formData.get('lengthIn') as string);
		const widthIn = parseFloat(formData.get('widthIn') as string);
		const heightIn = parseFloat(formData.get('heightIn') as string);
		const weightGrams = parseFloat(formData.get('weightGrams') as string);
		const costCents = Math.round(parseFloat(formData.get('cost') as string) * 100);
		const quantity = parseInt(formData.get('quantity') as string) || 0;
		const imageFile = formData.get('image') as File | null;
		const shouldRemoveImage = formData.get('removeImage') === 'true';

		if (!itemId || !name || !sku || isNaN(lengthIn) || isNaN(widthIn) || isNaN(heightIn) || isNaN(weightGrams) || isNaN(costCents)) {
			return fail(400, { error: 'Item ID, name, SKU, dimensions, weight, and cost are required' });
		}

		let imageUrl: string | undefined | null;

		if (shouldRemoveImage) {
			imageUrl = null;
		} else if (imageFile && imageFile.size > 0) {
			if (!ALLOWED_TYPES.includes(imageFile.type)) {
				return fail(400, { error: 'Image must be JPEG, PNG, GIF, or WebP' });
			}
			if (imageFile.size > MAX_SIZE) {
				return fail(400, { error: 'Image must be under 5MB' });
			}

			const cdnKey = env.HACK_CLUB_CDN_API_KEY;
			if (!cdnKey) {
				return fail(500, { error: 'CDN not configured' });
			}

			const uploadForm = new FormData();
			uploadForm.append('file', imageFile);

			const cdnResponse = await fetch('https://cdn.hackclub.com/api/v4/upload', {
				method: 'POST',
				headers: { 'Authorization': `Bearer ${cdnKey}` },
				body: uploadForm
			});

			if (!cdnResponse.ok) {
				const cdnError = await cdnResponse.json().catch(() => ({}));
				return fail(500, { error: cdnError.error || 'Failed to upload image' });
			}

			const cdnResult = await cdnResponse.json();
			imageUrl = cdnResult.url;
		}

		try {
			const updateData: Record<string, unknown> = {
				name,
				sku,
				categoryId: categoryId || null,
				sizing: sizing || null,
				lengthIn,
				widthIn,
				heightIn,
				weightGrams,
				costCents,
				quantity,
				updatedAt: new Date()
			};
			if (imageUrl !== undefined) {
				updateData.imageUrl = imageUrl;
			}
			await db.update(warehouseItem).set(updateData).where(eq(warehouseItem.id, itemId));
		} catch {
			return fail(400, { error: 'Failed to update item. SKU may already exist.' });
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
