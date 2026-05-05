import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import {
	userPathway,
	pathwayShop,
	shopItem,
	shopOrder,
	transactionLedger
} from '$lib/server/db/schema';
import { and, eq, sql, desc, gte } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { PATHWAY_IDS, type PathwayId } from '$lib/pathways';
import { z } from 'zod';
import { addressSchema, type AddressInput } from '$lib/server/validation';
import { ambassadorPathway } from '$lib/server/db/schema';


const purchaseSchema = z.object({
	itemId: z.string().min(1),
	userNotes: z.string().max(500).optional(),
	shippingAddress: addressSchema.optional() // optional as user might not actually be buying a physical item, in which case i don't think we need it
});

const cancelSchema = z.object({
	orderId: z.string().min(1) // needs to be a valid string
});

// guard for load + actions
// returns pathway ID and the shop item 
async function assertShopAccess(userId: string, pathwayParam: string) {
    const pathwayId = pathwayParam.toUpperCase();
    if (!PATHWAY_IDS.includes(pathwayId as PathwayId)) throw error(404, 'Pathway not found');
    const typedPathwayId = pathwayId as PathwayId;

    const membership = await db
        .select()
        .from(userPathway)
        .where(and(eq(userPathway.userId, userId), eq(userPathway.pathway, typedPathwayId)))
        .limit(1);
    if (membership.length === 0) throw redirect(302, '/app');

    const pathwayShopRow = await db
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
        const { typedPathwayId, shop } = await assertShopAccess(locals.user.id, params.pathway);

		// 2. parse FormData → purchaseSchema.safeParse → fail(400) on error
		// 3. db.transaction(async (tx) => {
		//      a. re-fetch shop (isEnabled), item (isActive, pathway match)
		//      b. if item.itemType === 'PHYSICAL' require shippingAddress
		//      c. stock check: null (unlimited) OR > 0 → decrement
		//      d. recompute balance, ensure >= item.price
		//      e. insert shopOrder with snapshots (price/type/name/total)
		//      f. insert transactionLedger { amount: -price, reason:'PURCHASE',
		//                                    refType:'SHOP', refId: order.id }
		//    })
		// 4. return { success: true, orderId } or fail(...) with message
	},

	cancel: async ({ request, params, locals }) => {
        if (!locals.user) throw redirect(302, '/api/auth/login');
        const { typedPathwayId } = await assertShopAccess(locals.user.id, params.pathway);

		// 2. parse FormData → cancelSchema
		// 3. db.transaction:
		//      a. load order; assert userId === user.id and status === 'PENDING'
		//      b. set status = 'CANCELED', cancelledReason
		//      c. restore item.stock if not null
		//      d. insert transactionLedger { amount: +price, reason:'REFUND',
		//                                    refType:'SHOP', refId: order.id }
		// 4. return { success: true } or fail(...)
	}
};
