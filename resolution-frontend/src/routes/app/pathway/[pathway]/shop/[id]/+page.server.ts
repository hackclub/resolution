import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import {
	userPathway,
	pathwayShop,
	shopItem,
	shopOrder,
	transactionLedger
} from '$lib/server/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { PATHWAY_IDS, type PathwayId } from '$lib/pathways';
import { z } from 'zod';
import { addressSchema, validateFormData } from '$lib/server/validation';

// thrown inside transactions to abort + roll back; caught outside to convert to fail()
class ShopError extends Error {
	constructor(public status: number, public body: { message: string }) {
		super(body.message);
	}
}

// always collect a shipping address regardless of item type
const buySchema = z.object({
	userNotes: z.string().max(500).optional().default(''),
	phone: z
		.string()
		.min(1, 'Phone number is required')
		.max(30, 'Phone number is too long'),
	...addressSchema.shape
});

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function assertShopAccess(userId: string, pathwayParam: string, conn: DbOrTx = db) {
	const pathwayId = pathwayParam.toUpperCase();
	if (!PATHWAY_IDS.includes(pathwayId as PathwayId)) throw error(404, 'Pathway not found');
	const typedPathwayId = pathwayId as PathwayId;

	const membership = await conn
		.select()
		.from(userPathway)
		.where(and(eq(userPathway.userId, userId), eq(userPathway.pathway, typedPathwayId)))
		.limit(1);
	if (membership.length === 0) throw redirect(302, '/app');

	const pathwayShopRow = await conn
		.select()
		.from(pathwayShop)
		.where(eq(pathwayShop.pathway, typedPathwayId))
		.limit(1);
	if (pathwayShopRow.length === 0 || !pathwayShopRow[0].isEnabled) {
		throw error(404);
	}

	return { typedPathwayId, shop: pathwayShopRow[0] };
}

export const load: PageServerLoad = async ({ params, parent }) => {
	const { user } = await parent();
	const { typedPathwayId, shop } = await assertShopAccess(user.id, params.pathway);

	const [item] = await db
		.select()
		.from(shopItem)
		.where(
			and(
				eq(shopItem.id, params.id),
				eq(shopItem.pathway, typedPathwayId),
				eq(shopItem.isActive, true)
			)
		)
		.limit(1);

	if (!item) throw error(404, 'Item not found');

	const [{ balance }] = await db
		.select({
			balance: sql<number>`COALESCE(SUM(${transactionLedger.amount}), 0)`.mapWith(Number)
		})
		.from(transactionLedger)
		.where(
			and(eq(transactionLedger.userId, user.id), eq(transactionLedger.pathway, typedPathwayId))
		);

	return {
		pathwayId: typedPathwayId,
		shop: {
			currencyName: shop.currencyName,
			currencyNamePlural: shop.currencyNamePlural
		},
		item,
		balance,
		user: {
			firstName: user.firstName ?? '',
			lastName: user.lastName ?? '',
			email: user.email ?? ''
		}
	};
};

export const actions = {
	buy: async ({ request, params, locals }) => {
		if (!locals.user) throw redirect(302, '/api/auth/login');
		const userId = locals.user.id;

		const buyData = await validateFormData(buySchema, request);

		const shippingAddress = {
			addressLine1: buyData.addressLine1,
			addressLine2: buyData.addressLine2,
			city: buyData.city,
			stateProvince: buyData.stateProvince,
			country: buyData.country,
			zipPostalCode: buyData.zipPostalCode
		};

		let orderId: string;
		try {
			orderId = await db.transaction(async (tx) => {
				const { typedPathwayId } = await assertShopAccess(userId, params.pathway, tx);

				const [item] = await tx
					.select()
					.from(shopItem)
					.where(
						and(
							eq(shopItem.id, params.id),
							eq(shopItem.pathway, typedPathwayId),
							eq(shopItem.isActive, true)
						)
					)
					.limit(1);

				if (!item) throw new ShopError(404, { message: 'Item not found' });

				const [{ balance }] = await tx
					.select({
						balance: sql<number>`COALESCE(SUM(${transactionLedger.amount}), 0)`.mapWith(Number)
					})
					.from(transactionLedger)
					.where(
						and(
							eq(transactionLedger.userId, userId),
							eq(transactionLedger.pathway, typedPathwayId)
						)
					);

				if (balance < item.price) {
					throw new ShopError(400, { message: 'Not enough currency' });
				}

				if (item.stock !== null) {
					if (item.stock <= 0) throw new ShopError(400, { message: 'No stock remaining' });
					await tx
						.update(shopItem)
						.set({ stock: item.stock - 1 })
						.where(eq(shopItem.id, item.id));
				}

				const [order] = await tx
					.insert(shopOrder)
					.values({
						userId,
						pathway: typedPathwayId,
						totalAmount: item.price,
						item: item.id,
						itemPriceSnapshot: item.price,
						itemNameSnapshot: item.name,
						shippingAddress,
						phone: buyData.phone,
						userNotes: buyData.userNotes || null
					})
					.returning({ id: shopOrder.id });

				await tx.insert(transactionLedger).values({
					userId,
					pathway: typedPathwayId,
					amount: -item.price,
					reason: 'PURCHASE',
					refType: 'SHOP',
					refId: order.id
				});

				return order.id;
			});
		} catch (e) {
			if (e instanceof ShopError) return fail(e.status, e.body);
			throw e;
		}

		return { success: true, orderId };
	}
} satisfies Actions;
