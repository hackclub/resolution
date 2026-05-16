// NOTE: MOST OF THE HCB LOGIC IS VIBED. I DON'T TRUST MYSELF WITH WAREHOUSE OR HCB.
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import {
	shopItem,
	pathwayEnum,
	ambassadorPathway,
	warehouseOrder,
	warehouseOrderItem,
	warehouseOrderTemplate,
	warehouseOrderTemplateItem,
	warehouseItem,
    shopOrder
} from '$lib/server/db/schema';
import { and, eq, gte, inArray, or, sql } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
// import { PATHWAY_IDS, type PathwayId } from '$lib/pathways';
import { z } from 'zod';
import { PATHWAYS, type PathwayId } from '$lib/pathways';
import { createHcbTransfer, getOrgIdForPathway } from '$lib/server/hcb';
import { selectPackaging } from '$lib/server/packaging';
import { fetchCheapestRate } from '$lib/server/canada-post';
import { resolveCountryCode } from '$lib/server/countries';

// Hard cap on the auto fetched shipping estimate. Mirrors the limit in
// /warehouse/orders/new so a rogue rate response cannot trigger a huge
// HCB transfer.
const MAX_SHIPPING_CENTS = 50_000;

const pathwayIdSchema = z.enum(
  PATHWAYS.map((p) => p.id) as [PathwayId, ...PathwayId[]]
);

const approveSchema = z.object({
    // pathway: pathwayIdSchema,
    id: z.string().min(1).max(100), // id for the order
    note: z.string().optional()
})

const rejectSchema = z.object({
    // pathway: pathwayIdSchema
    id: z.string().min(1).max(100),
    note: z.string()
})

export const load: PageServerLoad = async ({ params, parent }) => {
	const { user, pathwayId } = await parent();

    const pendingOrders = await db.query.shopOrder.findMany({
        where: and(eq(shopOrder.pathway, pathwayId), eq(shopOrder.status, 'PENDING')),
        with: { item: true }
    });

    // Collect every warehouse item and template needed across all orders so
    // we can batch the lookups instead of N round trips.
    const directItemIds = new Set<string>();
    const templateIds = new Set<string>();
    for (const o of pendingOrders) {
        if (!o.item) continue;
        if (o.item.sourceType === 'WAREHOUSE_ITEM' && o.item.linkedWarehouseItemId) {
            directItemIds.add(o.item.linkedWarehouseItemId);
        } else if (o.item.sourceType === 'WAREHOUSE_TEMPLATE' && o.item.linkedWarehouseTemplateId) {
            templateIds.add(o.item.linkedWarehouseTemplateId);
        }
    }

    const templateItemRows = templateIds.size > 0
        ? await db
            .select()
            .from(warehouseOrderTemplateItem)
            .where(inArray(warehouseOrderTemplateItem.templateId, [...templateIds]))
        : [];

    const templateMap = new Map<string, { warehouseItemId: string; quantity: number }[]>();
    for (const ti of templateItemRows) {
        const list = templateMap.get(ti.templateId) ?? [];
        list.push({ warehouseItemId: ti.warehouseItemId, quantity: ti.quantity });
        templateMap.set(ti.templateId, list);
        directItemIds.add(ti.warehouseItemId);
    }

    const stockRows = directItemIds.size > 0
        ? await db
            .select({
                id: warehouseItem.id,
                costCents: warehouseItem.costCents,
                lengthIn: warehouseItem.lengthIn,
                widthIn: warehouseItem.widthIn,
                heightIn: warehouseItem.heightIn,
                weightGrams: warehouseItem.weightGrams
            })
            .from(warehouseItem)
            .where(inArray(warehouseItem.id, [...directItemIds]))
        : [];
    const stockMap = new Map(stockRows.map((s) => [s.id, s]));

    // Quote each order in parallel. Shipping calls the carrier APIs so this
    // can be slow on big lists; CUSTOM orders are skipped entirely.
    const estimates = await Promise.all(pendingOrders.map(async (o) => {
        if (!o.item) return null;
        if (o.item.sourceType === 'CUSTOM') return null;

        let lineItems: { warehouseItemId: string; quantity: number }[] = [];
        if (o.item.sourceType === 'WAREHOUSE_ITEM' && o.item.linkedWarehouseItemId) {
            lineItems = [{ warehouseItemId: o.item.linkedWarehouseItemId, quantity: 1 }];
        } else if (o.item.sourceType === 'WAREHOUSE_TEMPLATE' && o.item.linkedWarehouseTemplateId) {
            lineItems = templateMap.get(o.item.linkedWarehouseTemplateId) ?? [];
        }
        if (lineItems.length === 0) return null;

        let itemTotalCents = 0;
        const packagingItems = [];
        for (const li of lineItems) {
            const s = stockMap.get(li.warehouseItemId);
            if (!s) return null;
            itemTotalCents += s.costCents * li.quantity;
            packagingItems.push({
                lengthIn: s.lengthIn,
                widthIn: s.widthIn,
                heightIn: s.heightIn,
                weightGrams: s.weightGrams,
                quantity: li.quantity
            });
        }

        let estimatedShippingCents: number | null = null;
        if (o.shippingAddress) {
            try {
                const packaging = selectPackaging(packagingItems);
                const quote = await fetchCheapestRate({
                    country: resolveCountryCode(o.shippingAddress.country),
                    postalCode: o.shippingAddress.zipPostalCode || undefined,
                    province: o.shippingAddress.stateProvince,
                    weightGrams: packaging.weightGrams,
                    lengthIn: packaging.lengthIn,
                    widthIn: packaging.widthIn,
                    heightIn: packaging.heightIn,
                    packageType: packaging.category === 'box' ? 'box' : 'flat'
                });
                if (quote) {
                    estimatedShippingCents = Math.min(
                        Math.round(quote.shippingCostUsd * 100),
                        MAX_SHIPPING_CENTS
                    );
                }
            } catch (e) {
                console.error(`Shipping quote failed for order ${o.id}:`, e);
            }
        }

        return {
            orderId: o.id,
            itemTotalCents,
            estimatedShippingCents,
            totalCents: itemTotalCents + (estimatedShippingCents ?? 0)
        };
    }));

    const estimatesByOrderId: Record<string, {
        itemTotalCents: number;
        estimatedShippingCents: number | null;
        totalCents: number;
    }> = {};
    for (const e of estimates) {
        if (e) estimatesByOrderId[e.orderId] = {
            itemTotalCents: e.itemTotalCents,
            estimatedShippingCents: e.estimatedShippingCents,
            totalCents: e.totalCents
        };
    }

    return { pendingOrders, estimatesByOrderId };
};

export const actions: Actions = {
    approve: async ({request, params, locals}) => {
        // frontend should send ID
        // 1. gate to ambassadors only (done)
        // 2. confirm ID exists (done)
        // 3. check if item is linked to wh template or item (done)
        // 3a. if 3 is yes, order (done)
        // 3b. (frontend) if 3 is no, notify ambassador they have to manually fufill (done)
        if (!locals.user) throw redirect(302, '/api/auth/login');
        const userId = locals.user.id;

        // pathway validation from param
        const rawPathway = params.pathway?.toUpperCase() ?? '';
        const pathwayParsed = pathwayIdSchema.safeParse(rawPathway);
        if (!pathwayParsed.success) throw error(404, 'Pathway not found');
        const pathwayId = pathwayParsed.data;

        // make sure its gated to ambassadors
        const assignment = await db.query.ambassadorPathway.findFirst({
            where: and(eq(ambassadorPathway.userId, userId), eq(ambassadorPathway.pathway, pathwayId))
        });
        if (!assignment) throw error(403, 'You are not authorized to do this action');

        const form = Object.fromEntries(await request.formData());
        const orderObj = approveSchema.safeParse(form);
        if (!orderObj.success) throw error(400, 'Invalid request data');

        const data = orderObj.data
        const order = await db.query.shopOrder.findFirst({
            where: and(eq(shopOrder.pathway, pathwayId), eq(shopOrder.id, data.id)),
            with: { item: true, user: true }
        });

        if (!order) throw error(404, 'Order not found')
        if (!order.item) throw error(400, 'Nonexistant order item')
        if (!order.user) throw error(400, 'Order has no associated user')
        if (!order.shippingAddress) throw error(400, 'Order missing shipping address')

        // need to build the warehouse items
        type LineItem = { warehouseItemId: string; quantity: number; sizingChoice: string | null };
        let lineItems: LineItem[] = [];

        if (order.item.sourceType === 'WAREHOUSE_ITEM') {
            if (!order.item.linkedWarehouseItemId) {
                throw error(400, 'Shop item is missing its linked warehouse item');
            }
            lineItems = [{
                warehouseItemId: order.item.linkedWarehouseItemId,
                quantity: 1,
                sizingChoice: null
            }];
        }
        else if (order.item.sourceType === 'WAREHOUSE_TEMPLATE') {
            if (!order.item.linkedWarehouseTemplateId) {
                throw error(400, 'Shop item is missing its linked warehouse template');
            }
            const tplItems = await db
                .select()
                .from(warehouseOrderTemplateItem)
                .where(eq(warehouseOrderTemplateItem.templateId, order.item.linkedWarehouseTemplateId));
            if (tplItems.length === 0) {
                throw error(400, 'Linked warehouse template has no items');
            }
            lineItems = tplItems.map((t) => ({
                warehouseItemId: t.warehouseItemId,
                quantity: t.quantity,
                sizingChoice: null
            }));
        }
        else {
            // nothing to ship so just mark it as done
            try {
                await db.transaction(async (tx) => {
                    await tx.update(shopOrder)
                        .set({
                            status: 'FULFILLED',
                            fufilledBy: userId,
                            fufilledAt: new Date(),
                            fufillerNotes: data.note ?? null
                        })
                        .where(eq(shopOrder.id, order.id));
                });
            } catch (e: any) {
                return fail(500, { error: e?.message || 'Failed to mark order as fulfilled' });
            }
            return { success: true };
        }

        // make sure stock is available before continuing
        const itemIds = lineItems.map((i) => i.warehouseItemId);
        const stock = await db
            .select({
                id: warehouseItem.id,
                name: warehouseItem.name,
                quantity: warehouseItem.quantity,
                costCents: warehouseItem.costCents,
                lengthIn: warehouseItem.lengthIn,
                widthIn: warehouseItem.widthIn,
                heightIn: warehouseItem.heightIn,
                weightGrams: warehouseItem.weightGrams,
                packageType: warehouseItem.packageType
            })
            .from(warehouseItem)
            .where(inArray(warehouseItem.id, itemIds));
        const stockMap = new Map(stock.map((s) => [s.id, s]));
        for (const li of lineItems) {
            const s = stockMap.get(li.warehouseItemId);
            if (!s || s.quantity < li.quantity) {
                const name = s?.name ?? li.warehouseItemId;
                const available = s?.quantity ?? 0;
                return fail(400, {
                    error: `Insufficient stock for "${name}": ${available} available, ${li.quantity} requested`
                });
            }
        }

        const addr = order.shippingAddress;
        const firstName = order.user.firstName ?? '';
        const lastName = order.user.lastName ?? '';
        const countryCode = resolveCountryCode(addr.country);

        // Build packaging from item dimensions, then quote the cheapest
        // carrier rate. Result is in USD dollars; warehouseOrder stores cents
        // so we convert and cap. Failures fall back to a 0 estimate, which
        // matches the behavior of the warehouse new order form when the
        // ambassador skips the quote step.
        const packagingItems = lineItems.map((li) => {
            const s = stockMap.get(li.warehouseItemId)!;
            return {
                lengthIn: s.lengthIn,
                widthIn: s.widthIn,
                heightIn: s.heightIn,
                weightGrams: s.weightGrams,
                quantity: li.quantity
            };
        });
        const packaging = selectPackaging(packagingItems);

        let estimatedShippingCents: number | null = null;
        let estimatedServiceName: string | null = null;
        try {
            const quote = await fetchCheapestRate({
                country: countryCode,
                postalCode: addr.zipPostalCode || undefined,
                province: addr.stateProvince,
                weightGrams: packaging.weightGrams,
                lengthIn: packaging.lengthIn,
                widthIn: packaging.widthIn,
                heightIn: packaging.heightIn,
                packageType: packaging.category === 'box' ? 'box' : 'flat'
            });
            if (quote) {
                const cents = Math.round(quote.shippingCostUsd * 100);
                estimatedShippingCents = Math.min(cents, MAX_SHIPPING_CENTS);
                estimatedServiceName = quote.serviceName;
            }
        } catch (e) {
            console.error(`Shipping rate quote failed for shop order ${order.id}:`, e);
        }

        let warehouseOrderId: string;
        try {
            warehouseOrderId = await db.transaction(async (tx) => {
                const [wo] = await tx.insert(warehouseOrder).values({
                    createdById: userId,
                    shopOrderId: order.id,
                    firstName,
                    lastName,
                    email: order.user!.email,
                    phone: order.phone ?? null,
                    addressLine1: addr.addressLine1,
                    addressLine2: addr.addressLine2 || null,
                    city: addr.city,
                    stateProvince: addr.stateProvince,
                    postalCode: addr.zipPostalCode ?? null,
                    country: addr.country,
                    status: 'APPROVED',
                    billingStatus: 'PENDING',
                    estimatedShippingCents,
                    estimatedServiceName,
                    packagingCategory: packaging.category,
                    packagingLabel: packaging.label,
                    packagingLengthIn: packaging.lengthIn,
                    packagingWidthIn: packaging.widthIn,
                    packagingHeightIn: packaging.heightIn,
                    packagingSubjectToChange: packaging.subjectToChange ?? false,
                    notes: `Shop order ${order.id}`
                }).returning({ id: warehouseOrder.id });

                await Promise.all(
                    lineItems.map((li) =>
                        tx.insert(warehouseOrderItem).values({
                            orderId: wo.id,
                            warehouseItemId: li.warehouseItemId,
                            quantity: li.quantity,
                            sizingChoice: li.sizingChoice
                        })
                    )
                );

                // ensure no overselling
                for (const li of lineItems) {
                    const s = stockMap.get(li.warehouseItemId);
                    const name = s?.name ?? li.warehouseItemId;
                    const [updated] = await tx
                        .update(warehouseItem)
                        .set({ quantity: sql`${warehouseItem.quantity} - ${li.quantity}` })
                        .where(and(
                            eq(warehouseItem.id, li.warehouseItemId),
                            gte(warehouseItem.quantity, li.quantity)
                        ))
                        .returning({ id: warehouseItem.id });
                    if (!updated) {
                        throw new Error(`Insufficient stock for "${name}", another order claimed it. Please retry.`);
                    }
                }

                await tx.update(shopOrder)
                    .set({ status: 'PROCESSING', fufilledBy: userId, fufillerNotes: data.note ?? null })
                    .where(eq(shopOrder.id, order.id));

                return wo.id;
            });
        } catch (e: any) {
            return fail(409, { error: e?.message || 'Order creation failed. Please try again.' });
        }

        // Bill the pathway's HCB org for item cost plus the estimated
        // shipping we just quoted. Mirrors /warehouse/orders/new: this is an
        // estimate!!
        // Failures are recorded on the warehouse order for manual
        // reconciliation rather than rolling back the order, since the items
        // are already reserved.
        const orgId = getOrgIdForPathway(pathwayId);
        if (orgId) {
            let itemsTotalCents = 0;
            for (const li of lineItems) {
                const s = stockMap.get(li.warehouseItemId);
                if (s) itemsTotalCents += s.costCents * li.quantity;
            }
            const totalCents = itemsTotalCents + (estimatedShippingCents ?? 0);

            if (totalCents > 0) {
                try {
                    await createHcbTransfer(
                        orgId,
                        totalCents,
                        `Shop fulfillment: warehouse order ${warehouseOrderId} (shop order ${order.id})`
                    );
                    await db.update(warehouseOrder)
                        .set({ billingStatus: 'CHARGED', updatedAt: new Date() })
                        .where(eq(warehouseOrder.id, warehouseOrderId));
                } catch (e: any) {
                    const reason = e?.message ? String(e.message).slice(0, 500) : 'Unknown error';
                    console.error(`HCB transfer failed for warehouse order ${warehouseOrderId}:`, reason);
                    await db.update(warehouseOrder)
                        .set({
                            billingStatus: 'FAILED',
                            billingFailureReason: reason,
                            updatedAt: new Date()
                        })
                        .where(eq(warehouseOrder.id, warehouseOrderId));
                }
            } else {
                await db.update(warehouseOrder)
                    .set({ billingStatus: 'CHARGED', updatedAt: new Date() })
                    .where(eq(warehouseOrder.id, warehouseOrderId));
            }
        } else {
            // No HCB org mapped for this pathway, mark as not applicable so
            // the order is not stuck in PENDING forever.
            await db.update(warehouseOrder)
                .set({ billingStatus: 'NOT_APPLICABLE', updatedAt: new Date() })
                .where(eq(warehouseOrder.id, warehouseOrderId));
        }

        return { success: true, warehouseOrderId };
    },
    deny: async ({request, params, locals}) => {
        // 1: mark the order as rejected
        // 2: add reason
        // 3: yeah
         if (!locals.user) throw redirect(302, '/api/auth/login');
        const userId = locals.user.id;

        // pathway validation from param
        const rawPathway = params.pathway?.toUpperCase() ?? '';
        const pathwayParsed = pathwayIdSchema.safeParse(rawPathway);
        if (!pathwayParsed.success) throw error(404, 'Pathway not found');
        const pathwayId = pathwayParsed.data;

        // make sure its gated to ambassadors
        const assignment = await db.query.ambassadorPathway.findFirst({
            where: and(eq(ambassadorPathway.userId, userId), eq(ambassadorPathway.pathway, pathwayId))
        });
        if (!assignment) throw error(403, 'You are not authorized to do this action');

        const form = Object.fromEntries(await request.formData());
        const orderObj = rejectSchema.safeParse(form);
        if (!orderObj.success) throw error(400, 'Invalid request data');

        const data = orderObj.data
        const order = await db.query.shopOrder.findFirst({
            where: and(eq(shopOrder.pathway, pathwayId), eq(shopOrder.id, data.id)),
            with: { item: true, user: true }
        });

        if (!order) throw error(400, 'Order ID does not exist');

        await db.update(shopOrder)
            .set({ status: 'REJECTED', cancelledReason: data.note})
            .where(eq(shopOrder.id, data.id));
        
        return { success: true, orderId: data.id }
    }
}