import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { ambassadorPathway, pathwayShop, shopItem, shopOrder, transactionLedger, user, userPathway } from '$lib/server/db/schema';
import { and, desc, eq, notInArray } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { PATHWAYS, type PathwayId } from '$lib/pathways';

const pathwayIdSchema = z.enum(PATHWAYS.map((p) => p.id) as [PathwayId, ...PathwayId[]]);

// Recipient is identified by email so ambassadors don't have to look up
// internal user IDs. Amount is positive: this is the production GRANT path
// that seeds participant balances so they can actually buy things.
const grantSchema = z.object({
	recipientEmail: z.string().email().max(254),
	amount: z.coerce.number().int().positive().max(1_000_000),
	note: z.string().max(500).optional()
});

export const load: PageServerLoad = async ({ parent }) => {
	const { pathwayId } = await parent();

	const shop = await db.query.pathwayShop.findFirst({
		where: eq(pathwayShop.pathway, pathwayId)
	});
	if (!shop) throw error(404, 'Shop not found for this pathway');

	const items = await db
		.select()
		.from(shopItem)
		.where(eq(shopItem.pathway, pathwayId))
		.orderBy(desc(shopItem.createdAt));

	const totalOrders = await db.$count(shopOrder, eq(shopOrder.pathway, pathwayId));
	const awaitingFulfillment = await db.$count(
		shopOrder,
		and(
			eq(shopOrder.pathway, pathwayId),
			notInArray(shopOrder.status, ['FULFILLED', 'CANCELED', 'REJECTED'])
		)
	);

	return {
		shop: {
			isEnabled: shop.isEnabled,
			currencyName: shop.currencyName,
			currencyNamePlural: shop.currencyNamePlural
		},
		items,
		totalOrders,
		awaitingFulfillment
	};
};

export const actions: Actions = {
	grant: async ({ request, params, locals }) => {
		if (!locals.user) throw redirect(302, '/api/auth/login');
		const userId = locals.user.id;

		const rawPathway = params.pathway?.toUpperCase() ?? '';
		const pathwayParsed = pathwayIdSchema.safeParse(rawPathway);
		if (!pathwayParsed.success) throw error(404, 'Pathway not found');
		const pathwayId = pathwayParsed.data;

		// gate to ambassadors of this pathway
		const assignment = await db.query.ambassadorPathway.findFirst({
			where: and(eq(ambassadorPathway.userId, userId), eq(ambassadorPathway.pathway, pathwayId))
		});
		if (!assignment) throw error(403, 'You are not authorized to do this action');

		const form = Object.fromEntries(await request.formData());
		const parsed = grantSchema.safeParse(form);
		if (!parsed.success) return fail(400, { grantError: 'Invalid grant data' });
		const data = parsed.data;

		// Resolve recipient by email and confirm they are enrolled in this pathway
		const recipient = await db.query.user.findFirst({
			where: eq(user.email, data.recipientEmail)
		});
		if (!recipient) return fail(404, { grantError: 'No user with that email' });

		const enrolled = await db.query.userPathway.findFirst({
			where: and(eq(userPathway.userId, recipient.id), eq(userPathway.pathway, pathwayId))
		});
		if (!enrolled) return fail(400, { grantError: 'Recipient is not enrolled in this pathway' });

		await db.insert(transactionLedger).values({
			userId: recipient.id,
			pathway: pathwayId,
			amount: data.amount,
			reason: 'GRANT',
			note: data.note ?? null,
			grantedBy: userId
		});

		return { grantSuccess: true, recipientEmail: data.recipientEmail, amount: data.amount };
	}
};
