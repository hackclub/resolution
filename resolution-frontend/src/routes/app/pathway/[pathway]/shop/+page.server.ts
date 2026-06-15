import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import {
	shopItem,
	shopOrder,
	transactionLedger
} from '$lib/server/db/schema';
import { and, eq, sql, desc } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { validateFormData } from '$lib/server/validation';
import { assertShopAccess, ShopError } from '$lib/shop/utils';

const cancelSchema = z.object({
	orderId: z.string().min(1), // needs to be a valid string
    cancelReason: z.string().min(1)
});

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

                // restore stock if the item still exists and tracks stock.
                // Use a SQL-level increment so concurrent cancellations /
                // purchases don't lose updates.
                if (order.item) {
                    await tx.update(shopItem)
                        .set({ stock: sql`${shopItem.stock} + 1` })
                        .where(and(
                            eq(shopItem.id, order.item),
                            sql`${shopItem.stock} IS NOT NULL`
                        ));
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
