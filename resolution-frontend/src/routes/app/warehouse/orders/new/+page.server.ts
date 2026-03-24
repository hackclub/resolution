import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { warehouseItem, warehouseCategory, warehouseOrder, warehouseOrderItem, warehouseOrderTag, ambassadorPathway } from '$lib/server/db/schema';
import { eq, asc, desc, sql, inArray } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';

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

	const [items, categories, existingTags] = await Promise.all([
		db.select().from(warehouseItem).orderBy(asc(warehouseItem.name)),
		db.select().from(warehouseCategory).orderBy(asc(warehouseCategory.sortOrder)),
		db.selectDistinct({ tag: warehouseOrderTag.tag }).from(warehouseOrderTag).orderBy(asc(warehouseOrderTag.tag))
	]);

	return { items, categories, allTags: existingTags.map((t) => t.tag) };
};

export const actions: Actions = {
	createOrder: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) {
			return fail(401, { error: 'Not logged in' });
		}

		const formData = await request.formData();

		const firstName = formData.get('firstName') as string;
		const lastName = formData.get('lastName') as string;
		const email = formData.get('email') as string;
		const phone = formData.get('phone') as string;
		const addressLine1 = formData.get('addressLine1') as string;
		const addressLine2 = formData.get('addressLine2') as string;
		const city = formData.get('city') as string;
		const stateProvince = formData.get('stateProvince') as string;
		const postalCode = formData.get('postalCode') as string;
		const country = formData.get('country') as string;
		const notes = formData.get('notes') as string;
		const tagsString = formData.get('tags') as string;
		const estimatedShippingCents = formData.get('estimatedShippingCents') as string;
		const estimatedServiceName = formData.get('estimatedServiceName') as string;
		const estimatedServiceCode = formData.get('estimatedServiceCode') as string;

		const itemsJson = formData.get('items') as string;
		let items: { warehouseItemId: string; quantity: number; sizingChoice?: string }[] = [];
		try {
			items = JSON.parse(itemsJson || '[]');
		} catch {
			return fail(400, { error: 'Invalid items data' });
		}

		if (!firstName || !lastName || !email || !phone || !addressLine1 || !city || !stateProvince || !country) {
			return fail(400, { error: 'Missing required fields' });
		}

		if (items.length === 0) {
			return fail(400, { error: 'At least one item is required' });
		}

		// Check inventory before creating order
		const itemIds = items.map((i) => i.warehouseItemId);
		const currentStock = await db
			.select({ id: warehouseItem.id, name: warehouseItem.name, quantity: warehouseItem.quantity })
			.from(warehouseItem)
			.where(inArray(warehouseItem.id, itemIds));

		const stockMap = new Map(currentStock.map((s) => [s.id, s]));
		for (const item of items) {
			const stock = stockMap.get(item.warehouseItemId);
			if (!stock || stock.quantity < item.quantity) {
				const available = stock?.quantity ?? 0;
				const name = stock?.name ?? item.warehouseItemId;
				return fail(400, { error: `Insufficient stock for "${name}": ${available} available, ${item.quantity} requested` });
			}
		}

		const [order] = await db.insert(warehouseOrder).values({
			createdById: user.id,
			firstName,
			lastName,
			email,
			phone: phone || null,
			addressLine1,
			addressLine2: addressLine2 || null,
			city,
			stateProvince,
			postalCode: postalCode || null,
			country,
			notes: notes || null,
			status: 'APPROVED',
			estimatedShippingCents: estimatedShippingCents ? parseInt(estimatedShippingCents) : null,
			estimatedServiceName: estimatedServiceName || null,
			estimatedServiceCode: estimatedServiceCode || null
		}).returning({ id: warehouseOrder.id });

		await Promise.all(
			items.map((item) =>
				db.insert(warehouseOrderItem).values({
					orderId: order.id,
					warehouseItemId: item.warehouseItemId,
					quantity: item.quantity,
					sizingChoice: item.sizingChoice || null
				})
			)
		);

		await Promise.all(
			items.map((item) =>
				db.update(warehouseItem)
					.set({ quantity: sql`${warehouseItem.quantity} - ${item.quantity}` })
					.where(eq(warehouseItem.id, item.warehouseItemId))
			)
		);

		if (tagsString && tagsString.trim()) {
			const tags = tagsString.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
			if (tags.length > 0) {
				await db.insert(warehouseOrderTag).values(
					tags.map((tag) => ({
						orderId: order.id,
						tag
					}))
				);
			}
		}

		throw redirect(303, '/app/warehouse/orders');
	}
};
