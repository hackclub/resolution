import { dev } from '$app/environment';
import { db } from './db';
import { pathwayShop, shopItem } from './db/schema';
import { and, eq } from 'drizzle-orm';
import { PATHWAYS } from '$lib/pathways';

/**
 * Dev-only seed: ensure every pathway has an enabled `pathwayShop` and at
 * least one `shopItem`. No-op in production.
 */
export async function seedDevShops() {
	if (!dev) return;

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

		const existingItem = await db.query.shopItem.findFirst({
			where: and(eq(shopItem.pathway, id), eq(shopItem.isActive, true))
		});

		if (!existingItem) {
			await db.insert(shopItem).values({
				pathway: id,
				name: `${label} starter sticker`,
				description: `A test ${label} sticker seeded automatically in dev. Remove me before going live.`,
				price: 5,
				stock: 25,
				isActive: true
			});
		}
	}

	console.log('[dev seed] pathway shops + items ensured');
}
