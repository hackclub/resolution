import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { ambassadorPathway, shopItem, shopOrderItem, user, warehouseItem } from '$lib/server/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { ShopService } from '$lib/server/services/shopService';
import { markFulfilledSchema, sendToWarehouseSchema } from '$lib/server/validation/schemas';
import { PATHWAY_IDS, type PathwayId } from '$lib/pathways';

async function guard(userId: string, isAdmin: boolean, pathwayParam: string): Promise<PathwayId> {
	const p = pathwayParam.toUpperCase();
	if (!PATHWAY_IDS.includes(p as PathwayId)) throw error(404);
	const typed = p as PathwayId;
	if (!isAdmin) {
		const a = await db.select({ id: ambassadorPathway.id }).from(ambassadorPathway)
			.where(and(eq(ambassadorPathway.userId, userId), eq(ambassadorPathway.pathway, typed))).limit(1);
		if (a.length === 0) throw error(403);
	}
	return typed;
}

export const load: PageServerLoad = async ({ params, parent }) => {
	const { user: u } = await parent();
	const pathwayId = await guard(u.id, u.isAdmin, params.pathway);

	const [orders, shop] = await Promise.all([
		ShopService.listOrders(pathwayId),
		ShopService.getShopForPathway(pathwayId)
	]);

	const orderIds = orders.map((o) => o.id);
	const userIds = [...new Set(orders.map((o) => o.userId))];

	const [lineRows, userRows] = await Promise.all([
		orderIds.length > 0
			? db
					.select({
						orderId: shopOrderItem.orderId,
						quantity: shopOrderItem.quantity,
						unitCost: shopOrderItem.unitCostCurrency,
						itemName: shopItem.name,
						warehouseItemId: shopItem.warehouseItemId,
						warehouseItemName: warehouseItem.name
					})
					.from(shopOrderItem)
					.innerJoin(shopItem, eq(shopOrderItem.shopItemId, shopItem.id))
					.leftJoin(warehouseItem, eq(shopItem.warehouseItemId, warehouseItem.id))
					.where(inArray(shopOrderItem.orderId, orderIds))
			: Promise.resolve([] as never[]),
		userIds.length > 0
			? db
					.select({ id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email })
					.from(user)
					.where(inArray(user.id, userIds))
			: Promise.resolve([] as never[])
	]);

	return { pathwayId, shop, orders, lines: lineRows, users: userRows };
};

export const actions: Actions = {
	markFulfilled: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401);
		await guard(locals.user.id, locals.user.isAdmin, params.pathway!);
		const formData = await request.formData();
		const parsed = markFulfilledSchema.safeParse({
			orderId: formData.get('orderId'),
			trackingNumber: formData.get('trackingNumber'),
			carrier: formData.get('carrier')
		});
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0]?.message });
		try {
			await ShopService.markFulfilledManual(parsed.data.orderId, {
				trackingNumber: parsed.data.trackingNumber,
				carrier: parsed.data.carrier
			});
			return { success: true };
		} catch (e) {
			return fail(400, { error: e instanceof Error ? e.message : 'Failed' });
		}
	},

	sendToWarehouse: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401);
		await guard(locals.user.id, locals.user.isAdmin, params.pathway!);
		const formData = await request.formData();
		const orderIdsRaw = formData.get('orderIds') as string;
		let orderIds: string[] = [];
		try {
			orderIds = JSON.parse(orderIdsRaw || '[]');
		} catch {
			return fail(400, { error: 'Invalid order ids' });
		}
		const parsed = sendToWarehouseSchema.safeParse({
			orderIds,
			serviceCode: formData.get('serviceCode'),
			estimatedShippingCents: formData.get('estimatedShippingCents')
		});
		if (!parsed.success) return fail(400, { error: parsed.error.issues[0]?.message });

		try {
			const { warehouseOrderId } = await ShopService.sendOrdersToWarehouse(parsed.data.orderIds, {
				ambassadorUserId: locals.user.id,
				ambassadorIsAdmin: locals.user.isAdmin,
				estimatedShippingCents: parsed.data.estimatedShippingCents,
				estimatedServiceCode: parsed.data.serviceCode,
				estimatedServiceName: (formData.get('serviceName') as string) || undefined
			});
			return { success: true, warehouseOrderId };
		} catch (e) {
			return fail(400, { error: e instanceof Error ? e.message : 'Failed' });
		}
	}
};
