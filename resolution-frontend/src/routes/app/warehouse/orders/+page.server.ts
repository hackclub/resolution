import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { warehouseItem, warehouseOrder, warehouseOrderItem, warehouseOrderTag, ambassadorPathway } from '$lib/server/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';

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

	const items = await db
		.select()
		.from(warehouseItem)
		.orderBy(warehouseItem.name);

	const orders = await db.query.warehouseOrder.findMany({
		with: {
			createdBy: true,
			items: {
				with: {
					warehouseItem: true
				}
			},
			tags: true
		},
		orderBy: [desc(warehouseOrder.createdAt)]
	});

	const allTags = await db
		.selectDistinct({ tag: warehouseOrderTag.tag })
		.from(warehouseOrderTag)
		.orderBy(warehouseOrderTag.tag);

	return {
		items,
		orders,
		allTags: allTags.map((t) => t.tag),
		isAdmin: user.isAdmin
	};
};

/**
 * Estimates combined package dimensions for a set of items.
 *
 * Algorithm: "Flat-stack with bounding box"
 *
 * 1. Separate items into flats (postcards, stickers) and boxes.
 * 2. For flats: stack them — length and width are the max across all flats,
 *    height is the sum of all flat thicknesses (0.1 in each since they're ~paper).
 * 3. For boxes: stack them on their largest face — length and width are the max
 *    across all boxes, height is the sum of all box heights.
 * 4. Combine: the final bounding box uses the max length and width of both groups,
 *    and the summed height of both groups.
 * 5. Weight is always the simple sum of all item weights × quantities.
 * 6. If the total height is ≤ 0.5 in and all items are flats, the package is a flat/envelope.
 *    Otherwise it's a box.
 */
function estimatePackageDimensions(
	orderItems: Array<{ quantity: number; item: { packageType: string; lengthIn: number; widthIn: number; heightIn: number; weightGrams: number } }>
) {
	let maxLength = 0;
	let maxWidth = 0;
	let totalHeight = 0;
	let totalWeight = 0;
	let allFlats = true;

	for (const oi of orderItems) {
		const { item, quantity } = oi;
		const l = Math.max(item.lengthIn, item.widthIn);
		const w = Math.min(item.lengthIn, item.widthIn);
		const h = item.packageType === 'flat' ? 0.1 : item.heightIn;

		if (item.packageType !== 'flat') allFlats = false;

		maxLength = Math.max(maxLength, l);
		maxWidth = Math.max(maxWidth, w);
		totalHeight += h * quantity;
		totalWeight += item.weightGrams * quantity;
	}

	totalHeight = Math.round(totalHeight * 100) / 100;
	totalWeight = Math.round(totalWeight * 100) / 100;

	if (allFlats && totalHeight <= 0.5) {
		// Snap to available envelope sizes: 4x6in or 6x9in
		if (maxLength <= 6 && maxWidth <= 4) {
			return { lengthIn: 6, widthIn: 4, heightIn: 0, weightGrams: totalWeight, packageType: 'flat' as const };
		} else if (maxLength <= 9 && maxWidth <= 6) {
			return { lengthIn: 9, widthIn: 6, heightIn: 0, weightGrams: totalWeight, packageType: 'flat' as const };
		} else {
			// Too large for available envelopes — use bubble packet
			return { lengthIn: maxLength, widthIn: maxWidth, heightIn: 0.5, weightGrams: totalWeight, packageType: 'box' as const };
		}
	}

	return {
		lengthIn: maxLength,
		widthIn: maxWidth,
		heightIn: Math.max(totalHeight, 0.5),
		weightGrams: totalWeight,
		packageType: 'box' as const
	};
}

export const actions: Actions = {
	createOrder: async ({ request, locals }) => {
		if (!locals.user) throw error(401, 'Unauthorized');

		const ambassadorCheck = await db
			.select({ userId: ambassadorPathway.userId })
			.from(ambassadorPathway)
			.where(eq(ambassadorPathway.userId, locals.user.id))
			.limit(1);

		if (!locals.user.isAdmin && ambassadorCheck.length === 0) {
			return fail(403, { error: 'Access denied' });
		}

		const formData = await request.formData();
		const firstName = (formData.get('firstName') as string)?.trim();
		const lastName = (formData.get('lastName') as string)?.trim();
		const email = (formData.get('email') as string)?.trim();
		const phone = (formData.get('phone') as string)?.trim() || null;
		const addressLine1 = (formData.get('addressLine1') as string)?.trim();
		const addressLine2 = (formData.get('addressLine2') as string)?.trim() || null;
		const city = (formData.get('city') as string)?.trim();
		const stateProvince = (formData.get('stateProvince') as string)?.trim();
		const postalCode = (formData.get('postalCode') as string)?.trim() || null;
		const country = (formData.get('country') as string)?.trim().toUpperCase();
		const notes = (formData.get('notes') as string)?.trim() || null;

		if (!firstName || !lastName || !email || !addressLine1 || !city || !stateProvince || !country) {
			return fail(400, { error: 'First name, last name, email, address line 1, city, state/province, and country are required' });
		}

		// Parse items from form: itemId_0, qty_0, sizing_0, ...
		const orderItemsList: Array<{ warehouseItemId: string; quantity: number; sizingChoice: string | null }> = [];
		let i = 0;
		while (formData.has(`itemId_${i}`)) {
			const warehouseItemId = formData.get(`itemId_${i}`) as string;
			const qty = parseInt(formData.get(`qty_${i}`) as string) || 1;
			const sizing = (formData.get(`sizing_${i}`) as string)?.trim() || null;
			if (warehouseItemId && qty > 0) {
				orderItemsList.push({ warehouseItemId, quantity: qty, sizingChoice: sizing });
			}
			i++;
		}

		if (orderItemsList.length === 0) {
			return fail(400, { error: 'At least one item is required' });
		}

		// Look up the actual warehouse items for dimension estimation
		const itemIds = orderItemsList.map(oi => oi.warehouseItemId);
		const warehouseItems = await db
			.select()
			.from(warehouseItem)
			.where(eq(warehouseItem.id, itemIds[0]));

		// Fetch all needed items
		const allItems = await db.select().from(warehouseItem);
		const itemMap = new Map(allItems.map(it => [it.id, it]));

		const dimensionInput = orderItemsList.map(oi => ({
			quantity: oi.quantity,
			item: itemMap.get(oi.warehouseItemId)!
		})).filter(oi => oi.item);

		if (dimensionInput.length !== orderItemsList.length) {
			return fail(400, { error: 'One or more items not found' });
		}

		const dims = estimatePackageDimensions(dimensionInput);

		// Estimate shipping by calling our own shipping-rates endpoint logic
		let estimatedShippingCents: number | null = null;
		let estimatedServiceName: string | null = null;
		try {
			const { env } = await import('$env/dynamic/private');
			const originPostal = env.CP_ORIGIN_POSTAL_CODE;
			if (originPostal && env.CP_API_USERNAME && env.CP_API_PASSWORD && env.CP_CUSTOMER_NUMBER) {
				const INCHES_TO_CM = 2.54;
				const inchesToCm = (v: number) => Math.round(v * INCHES_TO_CM * 10) / 10;

				const lengthCm = inchesToCm(dims.lengthIn);
				const widthCm = inchesToCm(dims.widthIn);
				const heightCm = dims.packageType === 'flat' ? 0.5 : inchesToCm(dims.heightIn);
				const weightKg = Math.round(dims.weightGrams * 0.001 * 100) / 100;

				// Try lettermail first for small items
				const weightGrams = dims.weightGrams;
				const lengthMm = lengthCm * 10;
				const widthMm = widthCm * 10;
				const heightMm = heightCm * 10;

				const meetsMinDimensions = lengthMm >= 140 && widthMm >= 90;
				const isStandardSize = lengthMm <= 245 && widthMm <= 156 && heightMm <= 5;
				const isOversizeSize = lengthMm <= 380 && widthMm <= 270 && heightMm <= 20;

				if (meetsMinDimensions && isStandardSize && weightGrams <= 30 && weightGrams >= 2) {
					let price: number;
					if (country === 'CA') price = 1.75;
					else if (country === 'US') price = 2.0;
					else price = 3.5;
					estimatedShippingCents = Math.round(price * 100);
					estimatedServiceName = `Lettermail ${country === 'CA' ? 'Domestic' : country === 'US' ? 'USA' : 'International'}`;
				} else if (isOversizeSize && weightGrams >= 5 && weightGrams <= 500) {
					let price: number;
					if (country === 'CA') {
						if (weightGrams <= 100) price = 3.11;
						else if (weightGrams <= 200) price = 4.51;
						else if (weightGrams <= 300) price = 5.91;
						else if (weightGrams <= 400) price = 6.62;
						else price = 7.05;
					} else if (country === 'US') {
						if (weightGrams <= 100) price = 4.51;
						else if (weightGrams <= 200) price = 7.16;
						else price = 13.38;
					} else {
						if (weightGrams <= 100) price = 8.08;
						else if (weightGrams <= 200) price = 13.38;
						else price = 25.8;
					}
					estimatedShippingCents = Math.round(price * 100);
					estimatedServiceName = `Bubble Packet ${country === 'CA' ? 'Domestic' : country === 'US' ? 'USA' : 'International'}`;
				}

				// If no lettermail option, try Canada Post API for parcel rates
				if (estimatedShippingCents === null && weightKg > 0) {
					const buildDestinationXML = (c: string, pc?: string | null) => {
						if (c === 'CA') return `<domestic><postal-code>${(pc ?? '').replace(/\s/g, '').toUpperCase()}</postal-code></domestic>`;
						else if (c === 'US') return `<united-states><zip-code>${(pc ?? '').replace(/\s/g, '')}</zip-code></united-states>`;
						else if (pc) return `<international><country-code>${c}</country-code><postal-code>${pc}</postal-code></international>`;
						else return `<international><country-code>${c}</country-code></international>`;
					};

					const xmlBody = `<?xml version="1.0" encoding="UTF-8"?>
<mailing-scenario xmlns="http://www.canadapost.ca/ws/ship/rate-v4">
  <customer-number>${env.CP_CUSTOMER_NUMBER}</customer-number>
  ${env.CP_CONTRACT_ID ? `<contract-id>${env.CP_CONTRACT_ID}</contract-id>` : ''}
  <parcel-characteristics>
    <weight>${weightKg}</weight>
    <dimensions>
      <length>${lengthCm}</length>
      <width>${widthCm}</width>
      <height>${heightCm}</height>
    </dimensions>
  </parcel-characteristics>
  <origin-postal-code>${originPostal.replace(/\s/g, '').toUpperCase()}</origin-postal-code>
  <destination>
    ${buildDestinationXML(country, postalCode)}
  </destination>
</mailing-scenario>`;

					const cpEndpoint = env.CP_ENVIRONMENT === 'production'
						? 'https://soa-gw.canadapost.ca/rs/ship/price'
						: 'https://ct.soa-gw.canadapost.ca/rs/ship/price';

					const authString = btoa(`${env.CP_API_USERNAME}:${env.CP_API_PASSWORD}`);
					const response = await fetch(cpEndpoint, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/vnd.cpc.ship.rate-v4+xml',
							Accept: 'application/vnd.cpc.ship.rate-v4+xml',
							Authorization: `Basic ${authString}`,
							'Accept-language': 'en-CA'
						},
						body: xmlBody
					});

					if (response.ok) {
						// @ts-ignore - xml2js lacks type declarations
						const xml2js = await import('xml2js');
						const parser = new xml2js.default.Parser({ explicitArray: false });
						const result = await parser.parseStringPromise(await response.text());
						const priceQuotes = result?.['price-quotes']?.['price-quote'];
						if (priceQuotes) {
							const quotes = Array.isArray(priceQuotes) ? priceQuotes : [priceQuotes];
							// Pick cheapest option
							let cheapest: { due: number; name: string } | null = null;
							for (const q of quotes) {
								const due = parseFloat(q['price-details']?.due ?? '0');
								if (!cheapest || due < cheapest.due) {
									cheapest = { due, name: q['service-name'] };
								}
							}
							if (cheapest) {
								const cadToUsd = 0.73;
								const handlingFee = 2.0;
								const totalUSD = (cheapest.due + handlingFee) * cadToUsd;
								estimatedShippingCents = Math.round(totalUSD * 100);
								estimatedServiceName = cheapest.name;
							}
						}
					}
				}
			}
		} catch (err) {
			console.error('Shipping estimation failed:', err);
		}

		// Create order
		const [order] = await db.insert(warehouseOrder).values({
			createdById: locals.user.id,
			status: estimatedShippingCents ? 'ESTIMATED' : 'DRAFT',
			firstName,
			lastName,
			email,
			phone,
			addressLine1,
			addressLine2,
			city,
			stateProvince,
			postalCode,
			country,
			estimatedShippingCents,
			estimatedServiceName,
			estimatedPackageType: dims.packageType,
			estimatedTotalLengthIn: dims.lengthIn,
			estimatedTotalWidthIn: dims.widthIn,
			estimatedTotalHeightIn: dims.heightIn,
			estimatedTotalWeightGrams: dims.weightGrams,
			notes
		}).returning();

		// Create order items
		for (const oi of orderItemsList) {
			await db.insert(warehouseOrderItem).values({
				orderId: order.id,
				warehouseItemId: oi.warehouseItemId,
				quantity: oi.quantity,
				sizingChoice: oi.sizingChoice
			});
		}

		return { success: true };
	},

	addTag: async ({ request, locals }) => {
		if (!locals.user) throw error(401, 'Unauthorized');
		if (!locals.user.isAdmin) return fail(403, { error: 'Access denied' });

		const formData = await request.formData();
		const orderId = formData.get('orderId') as string;
		const tag = (formData.get('tag') as string)?.trim().toLowerCase();

		if (!orderId || !tag) return fail(400, { error: 'Order ID and tag required' });

		try {
			await db.insert(warehouseOrderTag).values({ orderId, tag });
		} catch {
			return fail(400, { error: 'Tag already exists on this order' });
		}

		return { success: true };
	},

	removeTag: async ({ request, locals }) => {
		if (!locals.user) throw error(401, 'Unauthorized');
		if (!locals.user.isAdmin) return fail(403, { error: 'Access denied' });

		const formData = await request.formData();
		const orderId = formData.get('orderId') as string;
		const tag = formData.get('tag') as string;

		if (!orderId || !tag) return fail(400, { error: 'Order ID and tag required' });

		await db.delete(warehouseOrderTag)
			.where(sql`${warehouseOrderTag.orderId} = ${orderId} AND ${warehouseOrderTag.tag} = ${tag}`);

		return { success: true };
	},

	deleteOrder: async ({ request, locals }) => {
		if (!locals.user) throw error(401, 'Unauthorized');

		const formData = await request.formData();
		const orderId = formData.get('orderId') as string;
		if (!orderId) return fail(400, { error: 'Order ID required' });

		// Only admins or the creator can delete
		const [order] = await db.select().from(warehouseOrder).where(eq(warehouseOrder.id, orderId));
		if (!order) return fail(404, { error: 'Order not found' });
		if (!locals.user.isAdmin && order.createdById !== locals.user.id) {
			return fail(403, { error: 'Access denied' });
		}

		await db.delete(warehouseOrderItem).where(eq(warehouseOrderItem.orderId, orderId));
		await db.delete(warehouseOrder).where(eq(warehouseOrder.id, orderId));

		return { success: true };
	}
};
