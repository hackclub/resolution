import { db } from '../db';
import {
	pathwayShop,
	shopItem,
	shopOrder,
	shopOrderItem,
	userPathway,
	warehouseItem,
	warehouseOrder,
	warehouseOrderItem,
	ambassadorPathway
} from '../db/schema';
import { and, eq, gte, inArray, sql, desc } from 'drizzle-orm';
import { sendFulfillmentEmail } from '../email';
import { createHcbTransfer, getOrgIdForPathway } from '../hcb';

type PathwayId = 'PYTHON' | 'RUST' | 'GAME_DEV' | 'HARDWARE' | 'DESIGN' | 'GENERAL_CODING';

export type PathwayShop = typeof pathwayShop.$inferSelect;
export type ShopItem = typeof shopItem.$inferSelect;
export type ShopOrder = typeof shopOrder.$inferSelect;
export type ShopOrderItem = typeof shopOrderItem.$inferSelect;

export interface ShopAddress {
	firstName: string;
	lastName: string;
	email: string;
	phone?: string | null;
	addressLine1: string;
	addressLine2?: string | null;
	city: string;
	stateProvince: string;
	postalCode?: string | null;
	country: string;
}

export interface ShopItemInput {
	name: string;
	description?: string;
	imageUrl?: string | null;
	costCurrency: number;
	warehouseItemId?: string | null;
	isActive?: boolean;
}

export const ShopService = {
	/** Get the pathway shop row, creating it lazily if it doesn't exist. */
	async getShopForPathway(pathway: PathwayId): Promise<PathwayShop> {
		const existing = await db.query.pathwayShop.findFirst({
			where: eq(pathwayShop.pathway, pathway)
		});
		if (existing) return existing;
		const [created] = await db.insert(pathwayShop).values({ pathway }).returning();
		return created;
	},

	async updateShopSettings(
		pathway: PathwayId,
		input: { currencyName: string; currencyIconUrl?: string | null }
	): Promise<PathwayShop> {
		await this.getShopForPathway(pathway);
		const [updated] = await db
			.update(pathwayShop)
			.set({
				currencyName: input.currencyName,
				currencyIconUrl: input.currencyIconUrl ?? null,
				updatedAt: new Date()
			})
			.where(eq(pathwayShop.pathway, pathway))
			.returning();
		return updated;
	},

	async listItems(pathway: PathwayId, opts: { activeOnly?: boolean } = {}): Promise<ShopItem[]> {
		const where = opts.activeOnly
			? and(eq(shopItem.pathway, pathway), eq(shopItem.isActive, true))
			: eq(shopItem.pathway, pathway);
		return db.select().from(shopItem).where(where).orderBy(desc(shopItem.createdAt));
	},

	async getItem(itemId: string): Promise<ShopItem | undefined> {
		return db.query.shopItem.findFirst({ where: eq(shopItem.id, itemId) });
	},

	async createItem(pathway: PathwayId, input: ShopItemInput): Promise<ShopItem> {
		const [created] = await db
			.insert(shopItem)
			.values({
				pathway,
				name: input.name,
				description: input.description ?? '',
				imageUrl: input.imageUrl ?? null,
				costCurrency: input.costCurrency,
				warehouseItemId: input.warehouseItemId ?? null,
				isActive: input.isActive ?? true
			})
			.returning();
		return created;
	},

	async updateItem(itemId: string, input: ShopItemInput): Promise<ShopItem> {
		const [updated] = await db
			.update(shopItem)
			.set({
				name: input.name,
				description: input.description ?? '',
				imageUrl: input.imageUrl ?? null,
				costCurrency: input.costCurrency,
				warehouseItemId: input.warehouseItemId ?? null,
				isActive: input.isActive ?? true,
				updatedAt: new Date()
			})
			.where(eq(shopItem.id, itemId))
			.returning();
		return updated;
	},

	/** Soft delete: hide the item from participants but keep order history intact. */
	async deleteItem(itemId: string): Promise<void> {
		await db
			.update(shopItem)
			.set({ isActive: false, updatedAt: new Date() })
			.where(eq(shopItem.id, itemId));
	},

	async getBalance(userId: string, pathway: PathwayId): Promise<number> {
		const row = await db.query.userPathway.findFirst({
			where: and(eq(userPathway.userId, userId), eq(userPathway.pathway, pathway))
		});
		return row?.balance ?? 0;
	},

	async setBalance(userId: string, pathway: PathwayId, value: number): Promise<void> {
		const result = await db
			.update(userPathway)
			.set({ balance: value })
			.where(and(eq(userPathway.userId, userId), eq(userPathway.pathway, pathway)));
		if (result.rowCount === 0) {
			throw new Error('User is not enrolled in this pathway');
		}
	},

	/**
	 * Purchase a shop item. Atomically deducts balance (refusing if insufficient)
	 * and creates a PENDING shop order with one line item.
	 */
	async purchaseItem(
		userId: string,
		pathway: PathwayId,
		itemId: string,
		quantity: number,
		address: ShopAddress
	): Promise<ShopOrder> {
		const item = await db.query.shopItem.findFirst({
			where: and(eq(shopItem.id, itemId), eq(shopItem.pathway, pathway), eq(shopItem.isActive, true))
		});
		if (!item) throw new Error('Item not found or not available');

		const totalCost = item.costCurrency * quantity;

		// Atomic balance decrement: succeeds only if balance >= totalCost.
		const decResult = await db
			.update(userPathway)
			.set({ balance: sql`${userPathway.balance} - ${totalCost}` })
			.where(
				and(
					eq(userPathway.userId, userId),
					eq(userPathway.pathway, pathway),
					gte(userPathway.balance, totalCost)
				)
			);
		if (decResult.rowCount === 0) {
			throw new Error('Insufficient balance');
		}

		const [order] = await db
			.insert(shopOrder)
			.values({
				userId,
				pathway,
				status: 'PENDING',
				totalCurrency: totalCost,
				firstName: address.firstName,
				lastName: address.lastName,
				email: address.email,
				phone: address.phone ?? null,
				addressLine1: address.addressLine1,
				addressLine2: address.addressLine2 ?? null,
				city: address.city,
				stateProvince: address.stateProvince,
				postalCode: address.postalCode ?? null,
				country: address.country
			})
			.returning();

		await db.insert(shopOrderItem).values({
			orderId: order.id,
			shopItemId: item.id,
			quantity,
			unitCostCurrency: item.costCurrency
		});

		return order;
	},

	async listOrders(
		pathway: PathwayId,
		opts: { status?: 'PENDING' | 'FULFILLED' | 'SENT_TO_WAREHOUSE' | 'CANCELED' } = {}
	): Promise<ShopOrder[]> {
		const where = opts.status
			? and(eq(shopOrder.pathway, pathway), eq(shopOrder.status, opts.status))
			: eq(shopOrder.pathway, pathway);
		return db.select().from(shopOrder).where(where).orderBy(desc(shopOrder.createdAt));
	},

	async listOrdersForUser(userId: string, pathway?: PathwayId): Promise<ShopOrder[]> {
		const where = pathway
			? and(eq(shopOrder.userId, userId), eq(shopOrder.pathway, pathway))
			: eq(shopOrder.userId, userId);
		return db.select().from(shopOrder).where(where).orderBy(desc(shopOrder.createdAt));
	},

	async getOrderWithItems(orderId: string) {
		const order = await db.query.shopOrder.findFirst({
			where: eq(shopOrder.id, orderId),
			with: { items: { with: { shopItem: true } } }
		});
		return order;
	},

	/** Manual fulfillment path: ambassador enters tracking, participant gets emailed. */
	async markFulfilledManual(
		orderId: string,
		tracking: { trackingNumber: string; carrier: string }
	): Promise<ShopOrder> {
		const [updated] = await db
			.update(shopOrder)
			.set({
				status: 'FULFILLED',
				trackingNumber: tracking.trackingNumber,
				carrier: tracking.carrier,
				fulfilledAt: new Date()
			})
			.where(and(eq(shopOrder.id, orderId), eq(shopOrder.status, 'PENDING')))
			.returning();
		if (!updated) throw new Error('Order not found or not in PENDING state');
		await sendFulfillmentEmail(updated, tracking);
		return updated;
	},

	/**
	 * Group one or more PENDING shop orders from the SAME participant into a single
	 * warehouse order. Decrements warehouse inventory atomically and bills HCB
	 * against the ambassador's pathway organization.
	 *
	 * Mirrors the inventory + billing flow from
	 * src/routes/app/warehouse/orders/new/+page.server.ts createOrder.
	 */
	async sendOrdersToWarehouse(
		orderIds: string[],
		opts: {
			ambassadorUserId: string;
			ambassadorIsAdmin: boolean;
			estimatedShippingCents: number;
			estimatedServiceCode: string;
			estimatedServiceName?: string;
		}
	): Promise<{ warehouseOrderId: string }> {
		if (orderIds.length === 0) throw new Error('No orders selected');

		const orders = await db
			.select()
			.from(shopOrder)
			.where(inArray(shopOrder.id, orderIds));

		if (orders.length !== orderIds.length) throw new Error('One or more orders not found');

		const first = orders[0];
		for (const o of orders) {
			if (o.status !== 'PENDING') throw new Error(`Order ${o.id} is not PENDING`);
			if (o.userId !== first.userId) throw new Error('All orders must belong to the same participant');
			if (o.pathway !== first.pathway) throw new Error('All orders must be in the same pathway');
		}

		// Pull line items for all orders, joined to shopItem so we know warehouseItemId.
		const lines = await db
			.select({
				orderId: shopOrderItem.orderId,
				shopItemId: shopOrderItem.shopItemId,
				quantity: shopOrderItem.quantity,
				warehouseItemId: shopItem.warehouseItemId
			})
			.from(shopOrderItem)
			.innerJoin(shopItem, eq(shopOrderItem.shopItemId, shopItem.id))
			.where(inArray(shopOrderItem.orderId, orderIds));

		// Merge line items by warehouseItemId.
		const merged = new Map<string, number>();
		for (const line of lines) {
			if (!line.warehouseItemId) {
				throw new Error('One or more shop items are not linked to a warehouse item');
			}
			merged.set(line.warehouseItemId, (merged.get(line.warehouseItemId) ?? 0) + line.quantity);
		}
		if (merged.size === 0) throw new Error('No items to ship');

		// Inventory pre-check.
		const warehouseItemIds = [...merged.keys()];
		const stock = await db
			.select({
				id: warehouseItem.id,
				name: warehouseItem.name,
				quantity: warehouseItem.quantity,
				costCents: warehouseItem.costCents
			})
			.from(warehouseItem)
			.where(inArray(warehouseItem.id, warehouseItemIds));
		const stockMap = new Map(stock.map((s) => [s.id, s]));
		for (const [whItemId, qty] of merged) {
			const s = stockMap.get(whItemId);
			if (!s || s.quantity < qty) {
				throw new Error(`Insufficient stock for "${s?.name ?? whItemId}"`);
			}
		}

		// Create the warehouse order using the participant's address from the first shop order
		// (all selected orders are from the same user, so addresses should match — we use the first).
		const [whOrder] = await db
			.insert(warehouseOrder)
			.values({
				createdById: opts.ambassadorUserId,
				status: 'APPROVED',
				firstName: first.firstName,
				lastName: first.lastName,
				email: first.email,
				phone: first.phone,
				addressLine1: first.addressLine1,
				addressLine2: first.addressLine2,
				city: first.city,
				stateProvince: first.stateProvince,
				postalCode: first.postalCode,
				country: first.country,
				estimatedShippingCents: opts.estimatedShippingCents,
				estimatedServiceCode: opts.estimatedServiceCode,
				estimatedServiceName: opts.estimatedServiceName ?? null,
				notes: `Shop orders: ${orderIds.join(', ')}`
			})
			.returning({ id: warehouseOrder.id });

		// Insert merged line items.
		await Promise.all(
			[...merged.entries()].map(([whItemId, qty]) =>
				db.insert(warehouseOrderItem).values({
					orderId: whOrder.id,
					warehouseItemId: whItemId,
					quantity: qty
				})
			)
		);

		// Atomic inventory decrement (per item).
		for (const [whItemId, qty] of merged) {
			const result = await db
				.update(warehouseItem)
				.set({ quantity: sql`${warehouseItem.quantity} - ${qty}` })
				.where(and(eq(warehouseItem.id, whItemId), gte(warehouseItem.quantity, qty)));
			if (result.rowCount === 0) {
				throw new Error('Insufficient stock (concurrent update). Please try again.');
			}
		}

		// Mark all shop orders as sent to this warehouse order.
		await db
			.update(shopOrder)
			.set({ status: 'SENT_TO_WAREHOUSE', warehouseOrderId: whOrder.id })
			.where(inArray(shopOrder.id, orderIds));

		// HCB billing: charge the ambassador's pathway org for items + shipping.
		if (!opts.ambassadorIsAdmin) {
			const orgId = getOrgIdForPathway(first.pathway);
			if (orgId) {
				let itemsTotalCents = 0;
				for (const [whItemId, qty] of merged) {
					const s = stockMap.get(whItemId);
					if (s) itemsTotalCents += s.costCents * qty;
				}
				const totalCents = itemsTotalCents + opts.estimatedShippingCents;
				if (totalCents > 0) {
					await createHcbTransfer(
						orgId,
						totalCents,
						`Shop fulfillment warehouse order #${whOrder.id} (${orderIds.length} shop orders)`
					);
				}
			}
		}

		return { warehouseOrderId: whOrder.id };
	},

	/** Used by ambassador route guards. */
	async assertAmbassadorForPathway(userId: string, pathway: PathwayId, isAdmin: boolean): Promise<void> {
		if (isAdmin) return;
		const row = await db.query.ambassadorPathway.findFirst({
			where: and(eq(ambassadorPathway.userId, userId), eq(ambassadorPathway.pathway, pathway))
		});
		if (!row) throw new Error('Not assigned to this pathway');
	}
};
