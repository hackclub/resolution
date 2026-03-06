import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { warehouseBatch, warehouseBatchTag, warehouseOrderTemplate, warehouseOrder, warehouseOrderItem, warehouseOrderTag, warehouseItem, ambassadorPathway } from '$lib/server/db/schema';
import { eq, desc, asc, sql, inArray } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import xml2js from 'xml2js';

const INCHES_TO_CM = 2.54;
const GRAMS_TO_KG = 0.001;

function inchesToCm(inches: number): number {
	return Math.round(inches * INCHES_TO_CM * 10) / 10;
}

function buildDestinationXML(country: string, postalCode?: string): string {
	if (country === 'CA') {
		return `<domestic><postal-code>${(postalCode ?? '').replace(/\s/g, '').toUpperCase()}</postal-code></domestic>`;
	} else if (country === 'US') {
		return `<united-states><zip-code>${(postalCode ?? '').replace(/\s/g, '')}</zip-code></united-states>`;
	} else if (postalCode) {
		return `<international><country-code>${country}</country-code><postal-code>${postalCode}</postal-code></international>`;
	}
	return `<international><country-code>${country}</country-code></international>`;
}

function buildRateRequestXML(
	originPostal: string,
	country: string,
	postalCode: string | undefined,
	weightKg: number,
	lengthCm: number,
	widthCm: number,
	heightCm: number
): string {
	return `<?xml version="1.0" encoding="UTF-8"?>
<mailing-scenario xmlns="http://www.canadapost.ca/ws/ship/rate-v4">
  <customer-number>${env.CP_CUSTOMER_NUMBER}</customer-number>
  ${env.CP_CONTRACT_ID ? `<contract-id>${env.CP_CONTRACT_ID}</contract-id>` : ''}
  <parcel-characteristics>
    <weight>${Math.round(weightKg * 100) / 100}</weight>
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
}

interface PriceQuote {
	'service-name': string;
	'service-code': string;
	'price-details': {
		base?: string;
		due?: string;
		taxes?: {
			gst?: string | { $: string };
			pst?: string | { $: string };
			hst?: string | { $: string };
		};
	};
	'service-standard'?: {
		'expected-delivery-date'?: string;
		'expected-transit-time'?: string;
	};
}

function getTaxValue(tax: string | { $: string } | undefined): number {
	if (!tax) return 0;
	if (typeof tax === 'string') return parseFloat(tax) || 0;
	return parseFloat(tax.$) || 0;
}

function getLetterMailOptions(weightGrams: number, lengthCm: number, widthCm: number, heightCm: number, country: string) {
	const options: Array<{ serviceName: string; total: number }> = [];
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
		const countryLabel = country === 'CA' ? 'Domestic' : country === 'US' ? 'USA' : 'International';
		options.push({ serviceName: `Lettermail ${countryLabel} (up to 30g)`, total: price });
	}

	if (isOversizeSize && weightGrams >= 5 && weightGrams <= 500) {
		let price: number;
		const countryLabel = country === 'CA' ? 'Domestic' : country === 'US' ? 'USA' : 'International';
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
		options.push({ serviceName: `Bubble Packet ${countryLabel} (up to 500g)`, total: price });
	}

	return options;
}

async function fetchCheapestRate(
	country: string,
	postalCode: string | undefined,
	weightGrams: number,
	lengthIn: number,
	widthIn: number,
	heightIn: number,
	packageType: string
): Promise<{ serviceName: string; shippingCostUsd: number } | null> {
	const originPostal = env.CP_ORIGIN_POSTAL_CODE;
	if (!originPostal || !env.CP_API_USERNAME || !env.CP_API_PASSWORD || !env.CP_CUSTOMER_NUMBER) {
		return null;
	}

	let effectiveLength = lengthIn;
	let effectiveWidth = widthIn;
	let effectivePackageType = packageType;
	if (packageType === 'flat' || packageType === 'envelope') {
		const l = Math.max(lengthIn, widthIn);
		const w = Math.min(lengthIn, widthIn);
		if (l <= 6 && w <= 4) { effectiveLength = 6; effectiveWidth = 4; }
		else if (l <= 9 && w <= 6) { effectiveLength = 9; effectiveWidth = 6; }
		else { effectiveLength = l; effectiveWidth = w; effectivePackageType = 'box'; }
	}

	const lengthCm = inchesToCm(effectiveLength);
	const widthCm = inchesToCm(effectiveWidth);
	const heightCm = effectivePackageType === 'box'
		? inchesToCm(packageType === 'box' ? heightIn : 0.5)
		: 0.5;

	const allOptions: Array<{ serviceName: string; total: number }> = [];

	// Lettermail options
	allOptions.push(...getLetterMailOptions(weightGrams, lengthCm, widthCm, heightCm, country));

	// Canada Post parcel rates
	try {
		const cpEndpoint = env.CP_ENVIRONMENT === 'production'
			? 'https://soa-gw.canadapost.ca/rs/ship/price'
			: 'https://ct.soa-gw.canadapost.ca/rs/ship/price';

		const authString = btoa(`${env.CP_API_USERNAME}:${env.CP_API_PASSWORD}`);
		const weightKg = weightGrams * GRAMS_TO_KG;
		const xmlBody = buildRateRequestXML(originPostal, country, postalCode, weightKg, lengthCm, widthCm, heightCm);

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
			const xmlResponse = await response.text();
			const parser = new xml2js.Parser({ explicitArray: false });
			const result = await parser.parseStringPromise(xmlResponse);
			const cadToUsd = 0.73;
			const priceQuotes = result['price-quotes'] as { 'price-quote'?: PriceQuote | PriceQuote[] } | undefined;
			if (priceQuotes?.['price-quote']) {
				let quotes = priceQuotes['price-quote'];
				if (!Array.isArray(quotes)) quotes = [quotes];
				for (const quote of quotes) {
					const baseTotalCAD = parseFloat(quote['price-details'].due ?? '0');
					const totalUSD = Math.round((baseTotalCAD + 2.0) * cadToUsd * 100) / 100;
					allOptions.push({ serviceName: quote['service-name'], total: totalUSD });
				}
			}
		}
	} catch (err) {
		console.error('Parcel rate lookup failed:', err);
	}

	if (allOptions.length === 0) return null;

	allOptions.sort((a, b) => a.total - b.total);
	return { serviceName: allOptions[0].serviceName, shippingCostUsd: allOptions[0].total };
}

function parseCsv(raw: string): string[][] {
	const rows: string[][] = [];
	const lines = raw.split(/\r?\n/);
	for (const line of lines) {
		if (!line.trim()) continue;
		const cells: string[] = [];
		let i = 0;
		while (i < line.length) {
			if (line[i] === '"') {
				let value = '';
				i++; // skip opening quote
				while (i < line.length) {
					if (line[i] === '"' && i + 1 < line.length && line[i + 1] === '"') {
						value += '"';
						i += 2;
					} else if (line[i] === '"') {
						i++; // skip closing quote
						break;
					} else {
						value += line[i];
						i++;
					}
				}
				cells.push(value);
				if (i < line.length && line[i] === ',') i++; // skip comma
			} else {
				let value = '';
				while (i < line.length && line[i] !== ',') {
					value += line[i];
					i++;
				}
				cells.push(value.trim());
				if (i < line.length && line[i] === ',') i++;
			}
		}
		rows.push(cells);
	}
	return rows;
}

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

	const batches = await db.query.warehouseBatch.findMany({
		where: eq(warehouseBatch.createdById, user.id),
		with: {
			createdBy: true,
			template: {
				with: {
					items: {
						with: {
							warehouseItem: true
						}
					}
				}
			},
			tags: true
		},
		orderBy: [desc(warehouseBatch.createdAt)]
	});

	const templates = await db.query.warehouseOrderTemplate.findMany({
		with: {
			items: {
				with: {
					warehouseItem: true
				}
			}
		},
		orderBy: [asc(warehouseOrderTemplate.name)]
	});

	const allTags = await db
		.selectDistinct({ tag: warehouseOrderTag.tag })
		.from(warehouseOrderTag)
		.orderBy(asc(warehouseOrderTag.tag));

	return {
		batches,
		templates,
		allTags: allTags.map((t) => t.tag)
	};
};

export const actions: Actions = {
	createBatch: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Not logged in' });

		const formData = await request.formData();
		const title = formData.get('title') as string;
		const templateId = formData.get('templateId') as string;
		const tagsString = formData.get('tags') as string;
		const csvData = formData.get('csvData') as string;

		if (!templateId || !csvData) {
			return fail(400, { error: 'Template and CSV data are required' });
		}

		const rows = parseCsv(csvData);
		const addressCount = rows.length > 1 ? rows.length - 1 : 0;

		const [batch] = await db.insert(warehouseBatch).values({
			createdById: user.id,
			templateId,
			title: title || null,
			csvData,
			addressCount
		}).returning({ id: warehouseBatch.id });

		if (tagsString && tagsString.trim()) {
			const tags = tagsString.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
			if (tags.length > 0) {
				await db.insert(warehouseBatchTag).values(
					tags.map((tag) => ({ batchId: batch.id, tag }))
				);
			}
		}

		return { success: true, batchId: batch.id };
	},

	mapFields: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Not logged in' });

		const formData = await request.formData();
		const batchId = formData.get('batchId') as string;
		const fieldMapping = formData.get('fieldMapping') as string;

		if (!batchId || !fieldMapping) {
			return fail(400, { error: 'Batch ID and field mapping are required' });
		}

		await db.update(warehouseBatch)
			.set({ fieldMapping, status: 'MAPPED', updatedAt: new Date() })
			.where(eq(warehouseBatch.id, batchId));

		return { success: true };
	},

	processBatch: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Not logged in' });

		const formData = await request.formData();
		const batchId = formData.get('batchId') as string;

		if (!batchId) return fail(400, { error: 'Batch ID is required' });

		const batch = await db.query.warehouseBatch.findFirst({
			where: eq(warehouseBatch.id, batchId),
			with: {
				template: {
					with: {
						items: true
					}
				},
				tags: true
			}
		});

		if (!batch) return fail(404, { error: 'Batch not found' });
		if (batch.status !== 'MAPPED') return fail(400, { error: 'Batch must be mapped before processing' });
		if (!batch.fieldMapping) return fail(400, { error: 'No field mapping found' });

		const mapping: Record<string, string> = JSON.parse(batch.fieldMapping);
		const rows = parseCsv(batch.csvData);

		if (rows.length < 2) return fail(400, { error: 'CSV has no data rows' });

		const headers = rows[0];
		const dataRows = rows.slice(1);

		for (const row of dataRows) {
			const getValue = (field: string): string => {
				const colName = mapping[field];
				if (!colName) return '';
				const colIndex = headers.indexOf(colName);
				if (colIndex === -1) return '';
				return (row[colIndex] || '').trim();
			};

			const firstName = getValue('firstName');
			const lastName = getValue('lastName');
			const email = getValue('email');
			const addressLine1 = getValue('addressLine1');
			const city = getValue('city');
			const stateProvince = getValue('stateProvince');
			const country = getValue('country');

			if (!firstName || !lastName || !email || !addressLine1 || !city || !stateProvince || !country) {
				continue;
			}

			const [order] = await db.insert(warehouseOrder).values({
				createdById: user.id,
				batchId,
				firstName,
				lastName,
				email,
				phone: getValue('phone') || null,
				addressLine1,
				addressLine2: getValue('addressLine2') || null,
				city,
				stateProvince,
				postalCode: getValue('postalCode') || null,
				country
			}).returning({ id: warehouseOrder.id });

			if (batch.template.items.length > 0) {
				await db.insert(warehouseOrderItem).values(
					batch.template.items.map((ti) => ({
						orderId: order.id,
						warehouseItemId: ti.warehouseItemId,
						quantity: ti.quantity
					}))
				);

				await Promise.all(
					batch.template.items.map((ti) =>
						db.update(warehouseItem)
							.set({ quantity: sql`${warehouseItem.quantity} - ${ti.quantity}` })
							.where(eq(warehouseItem.id, ti.warehouseItemId))
					)
				);
			}

			if (batch.tags.length > 0) {
				await db.insert(warehouseOrderTag).values(
					batch.tags.map((t) => ({
						orderId: order.id,
						tag: t.tag
					}))
				);
			}
		}

		await db.update(warehouseBatch)
			.set({ status: 'PROCESSED', updatedAt: new Date() })
			.where(eq(warehouseBatch.id, batchId));

		return { success: true };
	},

	calculateBatch: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Not logged in' });

		const formData = await request.formData();
		const batchId = formData.get('batchId') as string;
		if (!batchId) return fail(400, { error: 'Batch ID is required' });

		const batch = await db.query.warehouseBatch.findFirst({
			where: eq(warehouseBatch.id, batchId),
			with: {
				template: {
					with: {
						items: {
							with: {
								warehouseItem: true
							}
						}
					}
				},
				tags: true
			}
		});

		if (!batch) return fail(404, { error: 'Batch not found' });
		if (!batch.fieldMapping) return fail(400, { error: 'No field mapping found' });

		const mapping: Record<string, string> = JSON.parse(batch.fieldMapping);
		const rows = parseCsv(batch.csvData);
		if (rows.length < 2) return fail(400, { error: 'CSV has no data rows' });

		const headers = rows[0];
		const dataRows = rows.slice(1);

		// Compute package totals from template items
		const templateItems = batch.template.items;
		let totalWeight = 0;
		let maxLength = 0;
		let maxWidth = 0;
		let totalHeight = 0;
		let hasBox = false;

		for (const ti of templateItems) {
			const item = ti.warehouseItem;
			totalWeight += item.weightGrams * ti.quantity;
			maxLength = Math.max(maxLength, item.lengthIn);
			maxWidth = Math.max(maxWidth, item.widthIn);
			totalHeight += item.heightIn * ti.quantity;
			if (item.packageType === 'box') hasBox = true;
		}

		const packageType = hasBox || totalHeight > 0.5 ? 'box' : 'flat';

		// Calculate items cost per order
		let itemsCostCentsPerOrder = 0;
		for (const ti of templateItems) {
			itemsCostCentsPerOrder += ti.warehouseItem.costCents * ti.quantity;
		}

		// Check inventory
		const inventoryIssues: Array<{ itemName: string; sku: string; available: number; needed: number }> = [];
		const validOrderCount = dataRows.filter((row) => {
			const getValue = (field: string): string => {
				const colName = mapping[field];
				if (!colName) return '';
				const colIndex = headers.indexOf(colName);
				if (colIndex === -1) return '';
				return (row[colIndex] || '').trim();
			};
			return getValue('firstName') && getValue('lastName') && getValue('email') &&
				getValue('addressLine1') && getValue('city') && getValue('stateProvince') && getValue('country');
		}).length;

		for (const ti of templateItems) {
			const needed = ti.quantity * validOrderCount;
			if (needed > ti.warehouseItem.quantity) {
				inventoryIssues.push({
					itemName: ti.warehouseItem.name,
					sku: ti.warehouseItem.sku,
					available: ti.warehouseItem.quantity,
					needed
				});
			}
		}

		// Calculate shipping for each valid order
		const orderCosts: Array<{
			recipient: string;
			country: string;
			itemsCostUsd: number;
			shippingCostUsd: number | null;
			shippingMethod: string | null;
			totalUsd: number | null;
		}> = [];

		let totalItemsCostCents = 0;
		let totalShippingUsd = 0;
		let shippingFailures = 0;

		for (const row of dataRows) {
			const getValue = (field: string): string => {
				const colName = mapping[field];
				if (!colName) return '';
				const colIndex = headers.indexOf(colName);
				if (colIndex === -1) return '';
				return (row[colIndex] || '').trim();
			};

			const firstName = getValue('firstName');
			const lastName = getValue('lastName');
			const email = getValue('email');
			const addressLine1 = getValue('addressLine1');
			const city = getValue('city');
			const stateProvince = getValue('stateProvince');
			const country = getValue('country');

			if (!firstName || !lastName || !email || !addressLine1 || !city || !stateProvince || !country) {
				continue;
			}

			const postalCode = getValue('postalCode') || undefined;
			const itemsCostUsd = itemsCostCentsPerOrder / 100;
			totalItemsCostCents += itemsCostCentsPerOrder;

			const rate = await fetchCheapestRate(
				country.toUpperCase(),
				postalCode,
				totalWeight,
				maxLength,
				maxWidth,
				totalHeight,
				packageType
			);

			if (rate) {
				totalShippingUsd += rate.shippingCostUsd;
				orderCosts.push({
					recipient: `${firstName} ${lastName}`,
					country: country.toUpperCase(),
					itemsCostUsd,
					shippingCostUsd: rate.shippingCostUsd,
					shippingMethod: rate.serviceName,
					totalUsd: Math.round((itemsCostUsd + rate.shippingCostUsd) * 100) / 100
				});
			} else {
				shippingFailures++;
				orderCosts.push({
					recipient: `${firstName} ${lastName}`,
					country: country.toUpperCase(),
					itemsCostUsd,
					shippingCostUsd: null,
					shippingMethod: null,
					totalUsd: null
				});
			}
		}

		const totalItemsCostUsd = Math.round(totalItemsCostCents) / 100;
		const grandTotalUsd = Math.round((totalItemsCostUsd + totalShippingUsd) * 100) / 100;

		return {
			success: true,
			calculation: {
				orderCount: validOrderCount,
				totalItemsCostUsd,
				totalShippingUsd: Math.round(totalShippingUsd * 100) / 100,
				grandTotalUsd,
				shippingFailures,
				inventoryIssues,
				orders: orderCosts
			}
		};
	}
};
