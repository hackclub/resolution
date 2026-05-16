import { dev } from '$app/environment';
import { db } from './db';
import {
	pathwayShop,
	shopItem,
	shopOrder,
	user,
	userPathway
} from './db/schema';
import { and, eq } from 'drizzle-orm';
import { PATHWAYS } from '$lib/pathways';

const TEST_USER_ID = 'dev-seed-participant';
const TEST_USER_HACK_CLUB_ID = 'dev-seed-hackclub-id';
const TEST_USER_EMAIL = 'dev-seed-participant@example.com';

const TEST_ADDRESS = {
	addressLine1: '15 Falls Rd',
	addressLine2: '',
	city: 'Shelburne',
	stateProvince: 'VT',
	country: 'United States',
	zipPostalCode: '05482'
};

/**
 * Dev-only seed: ensure every pathway has an enabled `pathwayShop`, at least
 * one `shopItem`, and a couple of pending `shopOrder`s pointed at a fake
 * participant so the fulfill flow has something to render. No-op in production.
 */
export async function seedDevShops() {
	if (!dev) return;

	// Make sure a stable fake participant exists so we can hang seeded orders
	// off a real user row. Insert is idempotent via ON CONFLICT DO NOTHING.
	await db
		.insert(user)
		.values({
			id: TEST_USER_ID,
			email: TEST_USER_EMAIL,
			hackClubId: TEST_USER_HACK_CLUB_ID,
			firstName: 'Devon',
			lastName: 'Seeder'
		})
		.onConflictDoNothing();

	for (const { id, label } of PATHWAYS) {
		const existingShop = await db.query.pathwayShop.findFirst({
			where: eq(pathwayShop.pathway, id)
		});

		if (!existingShop) {
			await db.insert(pathwayShop).values({
				pathway: id,
				isEnabled: true,
				currencyName: 'wish',
				currencyNamePlural: 'wishes'
			});
		} else if (!existingShop.isEnabled) {
			await db
				.update(pathwayShop)
				.set({ isEnabled: true })
				.where(eq(pathwayShop.pathway, id));
		}

		let item = await db.query.shopItem.findFirst({
			where: and(eq(shopItem.pathway, id), eq(shopItem.isActive, true))
		});

		if (!item) {
			[item] = await db
				.insert(shopItem)
				.values({
					pathway: id,
					name: `${label} starter sticker`,
					description: `A test ${label} sticker seeded automatically in dev. Remove me before going live.`,
					price: 5,
					stock: 25,
					isActive: true
				})
				.returning();
		}

		// Make sure the test participant belongs to this pathway. Cheap insert,
		// guarded by the unique (user, pathway) index.
		await db
			.insert(userPathway)
			.values({ userId: TEST_USER_ID, pathway: id })
			.onConflictDoNothing();

		// Seed exactly one pending order per pathway/item pair so the fulfill
		// page has something to render. Skip if we've already seeded one.
		const existingOrder = await db.query.shopOrder.findFirst({
			where: and(
				eq(shopOrder.pathway, id),
				eq(shopOrder.userId, TEST_USER_ID),
				eq(shopOrder.item, item!.id),
				eq(shopOrder.status, 'PENDING')
			)
		});

		if (!existingOrder) {
			await db.insert(shopOrder).values({
				userId: TEST_USER_ID,
				pathway: id,
				status: 'PENDING',
				totalAmount: item!.price,
				item: item!.id,
				itemPriceSnapshot: item!.price,
				itemNameSnapshot: item!.name,
				shippingAddress: TEST_ADDRESS,
				phone: '555-0100',
				userNotes: `Auto-seeded test order for ${label}`
			});
		}
	}

	console.log('[dev seed] pathway shops + items + sample orders ensured');
}
