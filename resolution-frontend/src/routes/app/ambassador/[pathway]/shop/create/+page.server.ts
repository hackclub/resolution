// TODO: write tests!
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import {
	shopItem,
	pathwayEnum,
	ambassadorPathway,
	warehouseOrderTemplate,
	warehouseOrderTemplateItem,
	warehouseItem
} from '$lib/server/db/schema';
import { and, eq, or } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
// import { PATHWAY_IDS, type PathwayId } from '$lib/pathways';
import { z } from 'zod';
import { PATHWAYS, type PathwayId } from '$lib/pathways';

const pathwayIdSchema = z.enum(
  PATHWAYS.map((p) => p.id) as [PathwayId, ...PathwayId[]]
);

const addCustomItemSchema = z.object({ // for grants
    name: z.string().min(1).max(50),
    description: z.string().min(1).max(2000),
    imageUrl: z.url(),
    price: z.coerce.number().int(),
    stock: z.coerce.number().int(),
    isActive: z.coerce.boolean().default(false) // used because ambassador may not want it to be instantly available
})

const addWarehouseItemSchema = z.object({
    id: z.string().min(1), // item ID from warehouse
    // auto pull from warehouse but add optional overrides
    name: z.string().min(1).max(50).or(z.string().max(0)),
    description: z.string().min(1), // required bcs warehouse doesn't provide
    imageUrl: z.url().optional(),
    price: z.int(),
    // stock should be auto populated
    // stock: z.int().optional(), // optional stock override, check later that this is not over current stock
    isActive: z.boolean().default(false)
})

const addWarehouseTemplateSchema = z.object({
    id: z.string().min(1), // template ID from warehouse
    name: z.string().min(1).max(50).or(z.string().max(0)), // not necessarily going to match template name
    description: z.string().min(1).max(2000),
    imageUrl: z.url(),
    price: z.int(),
    // should be autopopulated
    // stock: z.int(), // set max as current stock
    isActive: z.boolean().default(false)
})

export const load: PageServerLoad = async ({ parent }) => {
    const { user, pathwayId } = await parent();

    const warehouseTemplates = await db
        .select()
        .from(warehouseOrderTemplate)
        .where(or(eq(warehouseOrderTemplate.createdById, user.id), eq(warehouseOrderTemplate.isPublic, true)));

    const warehouseItems = await db.select().from(warehouseItem);

    return { warehouseTemplates, warehouseItems, pathwayId };
};

export const actions: Actions = {
    createCustom: async ({ request, params, locals }) => {
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
        const addItemObj = addCustomItemSchema.safeParse(form);
        if (!addItemObj.success) throw error(400, 'Invalid request data');

        const data = addItemObj.data;

        const [inserted] = await db
            .insert(shopItem)
            .values({
                pathway: pathwayId,
                name: data.name,
                description: data.description,
                itemImageUrl: data.imageUrl,
                price: data.price,
                stock: data.stock,
                isActive: data.isActive,
                sourceType: 'CUSTOM',
                lastEditedBy: userId
            })
            .returning();

        return { success: true, item: inserted };
    },
    createWarehouse: async ({ request, params, locals }) => {
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
        const addItemObj = addWarehouseItemSchema.safeParse(form);
        if (!addItemObj.success) throw error(400, 'Invalid request data');

        const data = addItemObj.data;

        const wh = await db.query.warehouseItem.findFirst({
            where: eq(warehouseItem.id, data.id)
        });
        if (!wh) throw error(404, 'Warehouse item not found');

        // form values win when non-empty/non-null; otherwise fall back to the warehouse row
        const [inserted] = await db
            .insert(shopItem)
            .values({
                pathway: pathwayId,
                name:  data.name?.trim() || wh.name,
                description: data.description, // required from form
                itemImageUrl: data.imageUrl ?? wh.imageUrl,
                price: data.price,
                stock: wh.quantity,
                isActive: data.isActive,
                sourceType: 'WAREHOUSE_ITEM',
                linkedWarehouseItemId: wh.id,
                lastEditedBy: userId
            })
            .returning();

        return { success: true, item: inserted };

    },
    createWarehouseTemplate: async ({ request, params, locals }) => {
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
        const addItemObj = addWarehouseTemplateSchema.safeParse(form);
        if (!addItemObj.success) throw error(400, 'Invalid request data');

        const data = addItemObj.data;

        // fetch template, ensure access
        const tpl = await db.query.warehouseOrderTemplate.findFirst({
            where: eq(warehouseOrderTemplate.id, data.id)
        });
        if (!tpl) throw error(404, 'Warehouse template not found');
        if (tpl.createdById !== userId && !tpl.isPublic) {
            throw error(403, 'You cannot use this template');
        }

        // find max stock based on the stock of items within the template
        const tplItems = await db
            .select({
                perOrder: warehouseOrderTemplateItem.quantity,
                available: warehouseItem.quantity
            })
            .from(warehouseOrderTemplateItem)
            .innerJoin(
                warehouseItem,
                eq(warehouseItem.id, warehouseOrderTemplateItem.warehouseItemId)
            )
            .where(eq(warehouseOrderTemplateItem.templateId, tpl.id));

        if (tplItems.length === 0) throw error(400, 'Template has no items');

        // should be autopopulated
        const stock = Math.min(
            ...tplItems.map((i) => Math.floor(i.available / i.perOrder))
        );

        // form values win when provided; otherwise fall back to the template's name.
        const [inserted] = await db
            .insert(shopItem)
            .values({
                pathway: pathwayId,
                name: data.name?.trim() || tpl.name,
                description: data.description,
                itemImageUrl: data.imageUrl,
                price: data.price,
                stock,
                isActive: data.isActive,
                sourceType: 'WAREHOUSE_TEMPLATE',
                linkedWarehouseTemplateId: tpl.id,
                lastEditedBy: userId
            })
            .returning();

        return { success: true, item: inserted };
    }
}

// TODO: use this on item loads
// const items = await db
//   .select({
//     id: shopItem.id,
//     name: shopItem.name,
//     sourceType: shopItem.sourceType,
//     // …
//     effectiveStock: sql<number | null>`
//       CASE
//         WHEN ${shopItem.sourceType} = 'WAREHOUSE_ITEM' THEN ${warehouseItem.stock}
//         WHEN ${shopItem.sourceType} = 'WAREHOUSE_TEMPLATE' THEN (
//           SELECT MIN(wi.stock / wt.quantity)
//           FROM warehouse_order_template_item wt
//           JOIN warehouse_item wi ON wi.id = wt.warehouse_item_id
//           WHERE wt.template_id = ${shopItem.linkedWarehouseTemplateId}
//         )
//         ELSE ${shopItem.stock}
//       END
//     `
//   })
//   .from(shopItem)
//   .leftJoin(warehouseItem, eq(warehouseItem.id, shopItem.linkedWarehouseItemId));