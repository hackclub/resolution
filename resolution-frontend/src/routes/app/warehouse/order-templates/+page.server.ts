import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import {
	warehouseItem,
	warehouseOrderTemplate,
	warehouseOrderTemplateItem,
	ambassadorPathway
} from '$lib/server/db/schema';
import { eq, asc, desc } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import { guardAdminOrAmbassador } from '$lib/server/auth/guard';

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

	const [templates, items] = await Promise.all([
		db.query.warehouseOrderTemplate.findMany({
			with: {
				createdBy: {
				columns: {
					id: true,
					firstName: true,
					lastName: true,
					email: true
				}
			},
				items: {
					with: {
						warehouseItem: true
					}
				}
			},
			orderBy: [desc(warehouseOrderTemplate.createdAt)]
		}),
		db.select().from(warehouseItem).orderBy(asc(warehouseItem.name))
	]);

	return { templates, items, userId: user.id, isAdmin: user.isAdmin };
};

export const actions: Actions = {
	createTemplate: async ({ request, locals }) => {
		const guard = await guardAdminOrAmbassador(locals);
		if ('failResult' in guard) return guard.failResult;
		const { user } = guard;

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const isPublic = formData.get('isPublic') === 'true';
		const itemsJson = formData.get('items') as string;

		if (!name || !name.trim()) {
			return fail(400, { error: 'Template name is required' });
		}

		let parsedItems: unknown;
		try {
			parsedItems = JSON.parse(itemsJson || '[]');
		} catch (e) {
			console.error('warehouse/order-templates: failed to parse items JSON', { itemsJson, error: String(e), userId: user.id });
			return fail(400, { error: 'Invalid items data: could not parse JSON' });
		}

		const templateItemSchema = z.object({
			warehouseItemId: z.string().min(1),
			quantity: z.number().int().min(1)
		});
		const itemsResult = z.array(templateItemSchema).safeParse(parsedItems);
		if (!itemsResult.success) {
			console.error('warehouse/order-templates: items failed schema validation', { issues: itemsResult.error.issues, parsedItems, userId: user.id });
			return fail(400, { error: `Invalid items data: ${itemsResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}` });
		}
		const items = itemsResult.data;

		if (items.length === 0) {
			return fail(400, { error: 'At least one item is required' });
		}

		await db.transaction(async (tx) => {
			const [template] = await tx
				.insert(warehouseOrderTemplate)
				.values({
					createdById: user.id,
					name: name.trim(),
					isPublic
				})
				.returning({ id: warehouseOrderTemplate.id });

			await Promise.all(
				items.map((item) =>
					tx.insert(warehouseOrderTemplateItem).values({
						templateId: template.id,
						warehouseItemId: item.warehouseItemId,
						quantity: item.quantity
					})
				)
			);
		});

		return { success: true };
	},

	deleteTemplate: async ({ request, locals }) => {
		const guard = await guardAdminOrAmbassador(locals);
		if ('failResult' in guard) return guard.failResult;
		const { user } = guard;

		const formData = await request.formData();
		const templateId = formData.get('templateId') as string;

		if (!templateId) {
			return fail(400, { error: 'Template ID is required' });
		}

		const [template] = await db
			.select()
			.from(warehouseOrderTemplate)
			.where(eq(warehouseOrderTemplate.id, templateId))
			.limit(1);

		if (!template) {
			return fail(404, { error: 'Template not found' });
		}

		if (template.createdById !== user.id && !user.isAdmin) {
			return fail(403, { error: 'Not authorized to delete this template' });
		}

		await db
			.delete(warehouseOrderTemplate)
			.where(eq(warehouseOrderTemplate.id, templateId));

		return { success: true };
	}
};
