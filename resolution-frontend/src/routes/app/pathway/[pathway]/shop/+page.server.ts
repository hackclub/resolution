import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import {
	userPathway,
	pathwayShop,
	shopItem,
	shopOrder,
	transactionLedger
} from '$lib/server/db/schema';
import { and, eq, sql, desc, or } from 'drizzle-orm';
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


const purchaseSchema = z.object({
	itemId: z.string().min(1),
	userNotes: z.string().max(500).optional(),
	shippingAddress: addressSchema.optional() // optional as user might not actually be buying a physical item, in which case i don't think we need it
});

const cancelSchema = z.object({
	orderId: z.string().min(1), // needs to be a valid string
    cancelReason: z.string().min(1)
});

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

// guard for load + actions
// returns pathway ID and the shop item
// pass `tx` when calling inside a transaction so the re-check uses the same snapshot
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

    const pathwayItems = await db
        .select()
        .from(shopItem)
        .where(and(eq(shopItem.pathway, typedPathwayId), eq(shopItem.isActive, true))); // return all items minus inactive

    const [{ balance }] = await db
        .select({
            balance: sql<number>`COALESCE(SUM(${transactionLedger.amount}), 0)`.mapWith(Number)
        })
        .from(transactionLedger)
        .where(and(
            eq(transactionLedger.userId, user.id),
            eq(transactionLedger.pathway, typedPathwayId)
        ));

    const recentOrders = await db
        .select()
        .from(shopOrder)
        .where(and(eq(shopOrder.userId, user.id), eq(shopOrder.pathway, typedPathwayId)))
        .orderBy(desc(shopOrder.createdAt))
        .limit(5); // link to a seperate orders page, so we only need a preview

	return {
        pathwayId: typedPathwayId,
        shop: {
            isEnabled: shop.isEnabled,
            currencyName: shop.currencyName,
            currencyNamePlural: shop.currencyNamePlural
        },
        items: pathwayItems,
        balance, // this is the user bal btw just so we're clear
        orders: recentOrders
    };
};

export const actions: Actions = {
	purchase: async ({ request, params, locals }) => {
        if (!locals.user) throw redirect(302, '/api/auth/login');
        const userId = locals.user.id;

        const purchaseData = await validateFormData(purchaseSchema, request);

        let orderId: string;
        try {
            orderId = await db.transaction(async (tx) => {
                const { typedPathwayId } = await assertShopAccess(userId, params.pathway, tx);

                const [item] = await tx
                    .select()
                    .from(shopItem)
                    .where(and(
                        eq(shopItem.id, purchaseData.itemId),
                        eq(shopItem.pathway, typedPathwayId),
                        eq(shopItem.isActive, true)
                    ))
                    .limit(1);

                if (!item) throw new ShopError(400, { message: 'Item not found' });

                if (item.itemType === 'PHYSICAL' && !purchaseData.shippingAddress) {
                    throw new ShopError(400, { message: 'Shipping address required for physical items' });
                }

                const [{ balance }] = await tx
                    .select({
                        balance: sql<number>`COALESCE(SUM(${transactionLedger.amount}), 0)`.mapWith(Number)
                    })
                    .from(transactionLedger)
                    .where(and(
                        eq(transactionLedger.userId, userId),
                        eq(transactionLedger.pathway, typedPathwayId)
                    ));

                if (balance < item.price) {
                    throw new ShopError(400, { message: 'Not enough currency' });
                }

                if (item.stock !== null) {
                    if (item.stock <= 0) throw new ShopError(400, { message: 'No stock remaining' });
                    await tx.update(shopItem)
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
                        itemTypeSnapshot: item.itemType,
                        itemNameSnapshot: item.name,
                        shippingAddress: purchaseData.shippingAddress ?? null,
                        userNotes: purchaseData.userNotes ?? null
                    })
                    .returning({ id: shopOrder.id });

                await tx.insert(transactionLedger).values({
                    userId,
                    pathway: typedPathwayId,
                    amount: -item.price,
                    reason: 'PURCHASE',
                    refType: 'SHOP',
                    refId: order.id   // ← ties the ledger entry to the order
                });

                return order.id;
            });
        } catch (e) {
            if (e instanceof ShopError) return fail(e.status, e.body);
            throw e;
        }

        return { success: true, orderId };
	},

	cancel: async ({ request, params, locals }) => {
        if (!locals.user) throw redirect(302, '/api/auth/login');
        const userId = locals.user.id;

        const cancelData = await validateFormData(cancelSchema, request);

        try {
            await db.transaction(async (tx) => {
                const { typedPathwayId } = await assertShopAccess(userId, params.pathway, tx);

                const [order] = await tx
                    .select()
                    .from(shopOrder)
                    .where(and(
                        eq(shopOrder.id, cancelData.orderId),
                        eq(shopOrder.userId, userId),
                        eq(shopOrder.pathway, typedPathwayId),
                        eq(shopOrder.status, 'PENDING')
                    ))
                    .limit(1);

                if (!order) throw new ShopError(404, { message: 'No such order' });

                await tx.update(shopOrder)
                    .set({ status: 'CANCELED', cancelledReason: cancelData.cancelReason })
                    .where(eq(shopOrder.id, order.id));

                // restore stock if the item still exists and tracks stock
                if (order.item) {
                    const [item] = await tx
                        .select()
                        .from(shopItem)
                        .where(eq(shopItem.id, order.item))
                        .limit(1);
                    if (item && item.stock !== null) {
                        await tx.update(shopItem)
                            .set({ stock: item.stock + 1 })
                            .where(eq(shopItem.id, item.id));
                    }
                }

                // refund: positive ledger entry equal to what was originally charged
                await tx.insert(transactionLedger).values({
                    userId,
                    pathway: typedPathwayId,
                    amount: order.totalAmount, // amount that they paid
                    reason: 'REFUND',
                    refType: 'SHOP',
                    refId: order.id
                });
            });
        } catch (e) {
            if (e instanceof ShopError) return fail(e.status, e.body);
            throw e;
        }

        return { success: true };
	}
};
