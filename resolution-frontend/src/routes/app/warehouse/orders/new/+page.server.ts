import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { warehouseItem, warehouseCategory, warehouseOrder, warehouseOrderItem, warehouseOrderTag, ambassadorPathway } from '$lib/server/db/schema';
import { eq, and, gte, asc, desc, sql, inArray } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { createHcbTransfer, getOrgIdForPathway } from '$lib/server/hcb';

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

		if (!user.isAdmin) {
			const ambassadorCheck = await db
				.select({ userId: ambassadorPathway.userId })
				.from(ambassadorPathway)
				.where(eq(ambassadorPathway.userId, user.id))
				.limit(1);
			if (ambassadorCheck.length === 0) {
				return fail(403, { error: 'Access denied - admin or ambassador only' });
			}
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
			.select({ id: warehouseItem.id, name: warehouseItem.name, quantity: warehouseItem.quantity, costCents: warehouseItem.costCents })
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

		// Use a transaction so order + items + stock decrement are atomic
		let orderId: string;
		try {
			orderId = await db.transaction(async (tx) => {
				const [order] = await tx.insert(warehouseOrder).values({
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
						tx.insert(warehouseOrderItem).values({
							orderId: order.id,
							warehouseItemId: item.warehouseItemId,
							quantity: item.quantity,
							sizingChoice: item.sizingChoice || null
						})
					)
				);

				for (const item of items) {
					const result = await tx.update(warehouseItem)
						.set({ quantity: sql`${warehouseItem.quantity} - ${item.quantity}` })
						.where(and(eq(warehouseItem.id, item.warehouseItemId), gte(warehouseItem.quantity, item.quantity)));
					if (result.rowCount === 0) {
						throw new Error('Insufficient stock (concurrent update)');
					}
				}

				if (tagsString && tagsString.trim()) {
					const tags = tagsString.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
					if (tags.length > 0) {
						await tx.insert(warehouseOrderTag).values(
							tags.map((tag) => ({
								orderId: order.id,
								tag
							}))
						);
					}
				}

				return order.id;
			});
		} catch (e: any) {
			return fail(409, { error: e.message || 'Order creation failed. Please try again.' });
		}

		// HCB billing: charge the ambassador's pathway org (outside transaction — order is committed)
		if (!user.isAdmin) {
			const ambassadorPathways = await db
				.select({ pathway: ambassadorPathway.pathway })
				.from(ambassadorPathway)
				.where(eq(ambassadorPathway.userId, user.id))
				.limit(1);

			if (ambassadorPathways.length > 0) {
				const orgId = getOrgIdForPathway(ambassadorPathways[0].pathway);
				if (orgId) {
					let itemsTotalCents = 0;
					for (const item of items) {
						const stock = stockMap.get(item.warehouseItemId);
						if (stock) {
							itemsTotalCents += stock.costCents * item.quantity;
						}
					}
					const shippingCents = estimatedShippingCents ? parseInt(estimatedShippingCents) : 0;
					const totalCents = itemsTotalCents + shippingCents;

					if (totalCents > 0) {
						try {
							await createHcbTransfer(
								orgId,
								totalCents,
								`Warehouse order #${orderId} by ${firstName} ${lastName}`
							);
						} catch (e: any) {
							console.error('HCB transfer failed for order', orderId, e.message);
							// Order is already committed — log and continue rather than failing the user
							// TODO: flag order for manual billing review
						}
					}
				}
			}
		}

		throw redirect(303, '/app/warehouse/orders');
	}
};
