import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { warehouseItem, warehouseCategory, warehouseOrder, warehouseOrderItem, warehouseOrderTag, ambassadorPathway } from '$lib/server/db/schema';
import { eq, and, gte, asc, sql, inArray } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { createHcbTransfer, getOrgIdForPathway } from '$lib/server/hcb';
import { guardAdminOrAmbassador } from '$lib/server/auth/guard';
import { z } from 'zod';

// Hard cap on client-submitted shipping estimate. Prevents a hostile client from submitting
// a huge estimatedShippingCents that would propagate into the HCB transfer. Real shipping
// from Canada Post / Chit Chats is well below this for any sane package.
const MAX_SHIPPING_CENTS = 50_000;

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	if (!user.isAdmin) {
		const rows = await db
			.select({ userId: ambassadorPathway.userId })
			.from(ambassadorPathway)
			.where(eq(ambassadorPathway.userId, user.id))
			.limit(1);
		if (rows.length === 0) {
			throw error(403, 'Access denied');
		}
	}

	const [items, categories, existingTags] = await Promise.all([
		db.select().from(warehouseItem).orderBy(asc(warehouseItem.name)),
		db.select().from(warehouseCategory).orderBy(asc(warehouseCategory.sortOrder)),
		db.selectDistinct({ tag: warehouseOrderTag.tag }).from(warehouseOrderTag).orderBy(asc(warehouseOrderTag.tag))
	]);

	return { items, categories, allTags: existingTags.map((t) => t.tag) };
};

const createOrderFormSchema = z.object({
	firstName: z.string().min(1, 'First name is required'),
	lastName: z.string().min(1, 'Last name is required'),
	email: z.string().email('Valid email is required'),
	phone: z.string().optional().nullable(),
	addressLine1: z.string().min(1, 'Address is required'),
	addressLine2: z.string().optional().nullable(),
	city: z.string().min(1, 'City is required'),
	stateProvince: z.string().min(1, 'State/province is required'),
	postalCode: z.string().optional().nullable(),
	country: z.string().min(1, 'Country is required'),
	notes: z.string().optional().nullable(),
	tags: z.string().optional().nullable(),
	estimatedShippingCents: z.coerce.number().int().min(0).max(MAX_SHIPPING_CENTS).optional().nullable(),
	estimatedServiceName: z.string().optional().nullable(),
	estimatedServiceCode: z.string().optional().nullable(),
	packagingCategory: z.string().optional().nullable(),
	packagingLabel: z.string().optional().nullable(),
	packagingLengthIn: z.coerce.number().positive().optional().nullable(),
	packagingWidthIn: z.coerce.number().positive().optional().nullable(),
	packagingHeightIn: z.coerce.number().nonnegative().optional().nullable(),
	packagingSubjectToChange: z.string().optional().nullable()
});

const orderItemSchema = z.object({
	warehouseItemId: z.string().min(1),
	quantity: z.number().int().min(1),
	sizingChoice: z.string().nullable().optional()
});

function readField(formData: FormData, name: string): string | null {
	const value = formData.get(name);
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length === 0 ? null : trimmed;
}

export const actions: Actions = {
	createOrder: async ({ request, locals }) => {
		const guard = await guardAdminOrAmbassador(locals);
		if ('failResult' in guard) return guard.failResult;
		const { user } = guard;

		const formData = await request.formData();

		const rawFields = {
			firstName: readField(formData, 'firstName'),
			lastName: readField(formData, 'lastName'),
			email: readField(formData, 'email'),
			phone: readField(formData, 'phone'),
			addressLine1: readField(formData, 'addressLine1'),
			addressLine2: readField(formData, 'addressLine2'),
			city: readField(formData, 'city'),
			stateProvince: readField(formData, 'stateProvince'),
			postalCode: readField(formData, 'postalCode'),
			country: readField(formData, 'country'),
			notes: readField(formData, 'notes'),
			tags: readField(formData, 'tags'),
			estimatedShippingCents: readField(formData, 'estimatedShippingCents'),
			estimatedServiceName: readField(formData, 'estimatedServiceName'),
			estimatedServiceCode: readField(formData, 'estimatedServiceCode'),
			packagingCategory: readField(formData, 'packagingCategory'),
			packagingLabel: readField(formData, 'packagingLabel'),
			packagingLengthIn: readField(formData, 'packagingLengthIn'),
			packagingWidthIn: readField(formData, 'packagingWidthIn'),
			packagingHeightIn: readField(formData, 'packagingHeightIn'),
			packagingSubjectToChange: readField(formData, 'packagingSubjectToChange')
		};

		const parseForm = createOrderFormSchema.safeParse(rawFields);
		if (!parseForm.success) {
			return fail(400, { error: parseForm.error.issues[0].message });
		}
		const fields = parseForm.data;

		const itemsJson = formData.get('items');
		let parsed: unknown;
		try {
			parsed = JSON.parse(typeof itemsJson === 'string' ? itemsJson : '[]');
		} catch (e) {
			console.error('warehouse/orders/new: failed to parse items JSON', { error: String(e), userId: user.id });
			return fail(400, { error: 'Invalid items data: could not parse JSON' });
		}
		const parseResult = z.array(orderItemSchema).safeParse(parsed);
		if (!parseResult.success) {
			return fail(400, { error: `Invalid items data: ${parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}` });
		}
		const items = parseResult.data;

		if (items.length === 0) {
			return fail(400, { error: 'At least one item is required' });
		}

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

		const initialBillingStatus = user.isAdmin ? 'NOT_APPLICABLE' : 'PENDING';

		let orderId: string;
		try {
			orderId = await db.transaction(async (tx) => {
				const [order] = await tx.insert(warehouseOrder).values({
					createdById: user.id,
					firstName: fields.firstName,
					lastName: fields.lastName,
					email: fields.email,
					phone: fields.phone ?? null,
					addressLine1: fields.addressLine1,
					addressLine2: fields.addressLine2 ?? null,
					city: fields.city,
					stateProvince: fields.stateProvince,
					postalCode: fields.postalCode ?? null,
					country: fields.country,
					notes: fields.notes ?? null,
					status: 'APPROVED',
					estimatedShippingCents: fields.estimatedShippingCents ?? null,
					estimatedServiceName: fields.estimatedServiceName ?? null,
					estimatedServiceCode: fields.estimatedServiceCode ?? null,
					packagingCategory: fields.packagingCategory ?? null,
					packagingLabel: fields.packagingLabel ?? null,
					packagingLengthIn: fields.packagingLengthIn ?? null,
					packagingWidthIn: fields.packagingWidthIn ?? null,
					packagingHeightIn: fields.packagingHeightIn ?? null,
					packagingSubjectToChange: fields.packagingSubjectToChange === '1',
					billingStatus: initialBillingStatus
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
					const stock = stockMap.get(item.warehouseItemId);
					const itemName = stock?.name ?? item.warehouseItemId;
					const [updated] = await tx.update(warehouseItem)
						.set({ quantity: sql`${warehouseItem.quantity} - ${item.quantity}` })
						.where(and(eq(warehouseItem.id, item.warehouseItemId), gte(warehouseItem.quantity, item.quantity)))
						.returning({ id: warehouseItem.id });
					if (!updated) {
						throw new Error(`Insufficient stock for "${itemName}" — another order claimed it while yours was processing. Please refresh and try again.`);
					}
				}

				if (fields.tags) {
					const tags = fields.tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
					if (tags.length > 0) {
						await tx.insert(warehouseOrderTag).values(
							tags.map((tag) => ({ orderId: order.id, tag }))
						);
					}
				}

				return order.id;
			});
		} catch (e: any) {
			return fail(409, { error: e.message || 'Order creation failed. Please try again.' });
		}

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
					const shippingCents = fields.estimatedShippingCents ?? 0;
					const totalCents = itemsTotalCents + shippingCents;

					if (totalCents > 0) {
						try {
							await createHcbTransfer(
								orgId,
								totalCents,
								`Warehouse order #${orderId} by ${fields.firstName} ${fields.lastName}`
							);
							await db.update(warehouseOrder)
								.set({ billingStatus: 'CHARGED', updatedAt: new Date() })
								.where(eq(warehouseOrder.id, orderId));
						} catch (e: any) {
							const reason = e?.message ? String(e.message).slice(0, 500) : 'Unknown error';
							console.error(`HCB transfer failed for order ${orderId}:`, reason);
							await db.update(warehouseOrder)
								.set({ billingStatus: 'FAILED', billingFailureReason: reason, updatedAt: new Date() })
								.where(eq(warehouseOrder.id, orderId));
						}
					} else {
						// No dollars to charge — mark as charged (nothing owed)
						await db.update(warehouseOrder)
							.set({ billingStatus: 'CHARGED', updatedAt: new Date() })
							.where(eq(warehouseOrder.id, orderId));
					}
				}
			}
		}

		throw redirect(303, '/app/warehouse/orders');
	}
};
