import { env } from '$env/dynamic/private';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { warehouseOrder } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import xml2js from 'xml2js';
import type { RequestHandler } from './$types';

const INCHES_TO_CM = 2.54;
const GRAMS_TO_KG = 0.001;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

function buildPackingSlipBase64(order: any): string {
	const lines: string[] = [
		`PACKING SLIP`,
		`Order #${order.fulfillmentId}`,
		`Date: ${new Date().toLocaleDateString('en-US')}`,
		``,
		`SHIP TO:`,
		`${order.firstName} ${order.lastName}`,
		`${order.addressLine1}`,
		order.addressLine2 || '',
		`${order.city}, ${order.stateProvince} ${order.postalCode || ''}`,
		`${order.country}`,
		``,
		`CONTENTS:`,
		`${'Item'.padEnd(35)} ${'Size'.padEnd(10)} ${'Qty'.padEnd(5)}`,
		`${'─'.repeat(50)}`,
	];
	for (const oi of order.items) {
		const name = oi.warehouseItem.name.substring(0, 35).padEnd(35);
		const size = (oi.sizingChoice || '—').padEnd(10);
		const qty = String(oi.quantity).padEnd(5);
		lines.push(`${name} ${size} ${qty}`);
	}
	lines.push(`${'─'.repeat(50)}`);
	lines.push(`Total items: ${order.items.reduce((s: number, oi: any) => s + oi.quantity, 0)}`);
	if (order.notes) {
		lines.push(``);
		lines.push(`NOTES: ${order.notes}`);
	}
	const text = lines.filter(l => l !== undefined).join('\n');
	return btoa(unescape(encodeURIComponent(text)));
}

function inchesToCm(inches: number): number {
	return Math.round(inches * INCHES_TO_CM * 10) / 10;
}

function isLettermail(serviceName: string | null): boolean {
	if (!serviceName) return false;
	const lower = serviceName.toLowerCase();
	return lower.includes('lettermail') || lower.includes('bubble packet');
}

function buildCreateShipmentXML(order: any, weightKg: number, lengthCm: number, widthCm: number, heightCm: number, serviceCode: string): string {
	const originPostal = (env.CP_ORIGIN_POSTAL_CODE || '').replace(/\s/g, '').toUpperCase();
	const customerNumber = env.CP_CUSTOMER_NUMBER;
	const contractId = env.CP_CONTRACT_ID;

	let destinationXml = '';
	if (order.country === 'CA') {
		destinationXml = `<domestic>
			<postal-code>${(order.postalCode ?? '').replace(/\s/g, '').toUpperCase()}</postal-code>
		</domestic>`;
	} else if (order.country === 'US') {
		destinationXml = `<united-states>
			<zip-code>${(order.postalCode ?? '').replace(/\s/g, '')}</zip-code>
			<state-code>${order.stateProvince}</state-code>
		</united-states>`;
	} else {
		destinationXml = `<international>
			<country-code>${order.country}</country-code>
			${order.postalCode ? `<postal-code>${order.postalCode}</postal-code>` : ''}
		</international>`;
	}

	// For US/international shipments, add customs
	let customsXml = '';
	if (order.country !== 'CA') {
		const items = order.items || [];
		const skuLines = items.map((oi: any) => {
			const item = oi.warehouseItem;
			const unitWeightKg = Math.round(item.weightGrams * GRAMS_TO_KG * 1000) / 1000;
			const valuePerUnit = Math.round(item.costCents) / 100;
			return `<item>
				<customs-number-of-units>${oi.quantity}</customs-number-of-units>
				<customs-description>${item.name.substring(0, 44)}</customs-description>
				<unit-weight>${unitWeightKg}</unit-weight>
				<customs-value-per-unit>${valuePerUnit.toFixed(2)}</customs-value-per-unit>
				<country-of-origin>CA</country-of-origin>
			</item>`;
		}).join('\n');

		customsXml = `<customs>
			<currency>USD</currency>
			<conversion-from-cad>0.730</conversion-from-cad>
			<reason-for-export>SOG</reason-for-export>
			<other-reason>Merchandise</other-reason>
			<sku-list>${skuLines}</sku-list>
		</customs>`;
	}

	return `<?xml version="1.0" encoding="UTF-8"?>
<shipment xmlns="http://www.canadapost.ca/ws/shipment-v8">
	<transmit-shipment/>
	<requested-shipping-point>${originPostal}</requested-shipping-point>
	<provide-pricing-info>true</provide-pricing-info>
	<delivery-spec>
		<service-code>${serviceCode}</service-code>
		<sender>
			<name>${env.CP_SENDER_NAME || 'Hack Club'}</name>
			<company>${env.CP_SENDER_NAME || 'Hack Club'}</company>
			<contact-phone>${env.CP_SENDER_PHONE || '000-000-0000'}</contact-phone>
			<address-details>
				<address-line-1>${env.CP_SENDER_ADDRESS || ''}</address-line-1>
				${env.CP_SENDER_ADDRESS_2 ? `<address-line-2>${env.CP_SENDER_ADDRESS_2}</address-line-2>` : ''}
				<city>${env.CP_SENDER_CITY || ''}</city>
				<prov-state>${env.CP_SENDER_PROVINCE || ''}</prov-state>
				<country-code>CA</country-code>
				<postal-zip-code>${originPostal}</postal-zip-code>
			</address-details>
		</sender>
		<destination>
			<name>${order.firstName} ${order.lastName}</name>
			<address-details>
				<address-line-1>${order.addressLine1}</address-line-1>
				${order.addressLine2 ? `<address-line-2>${order.addressLine2}</address-line-2>` : ''}
				<city>${order.city}</city>
				<prov-state>${order.stateProvince}</prov-state>
				<country-code>${order.country}</country-code>
				<postal-zip-code>${(order.postalCode ?? '').replace(/\s/g, '').toUpperCase()}</postal-zip-code>
			</address-details>
		</destination>
		<parcel-characteristics>
			<weight>${Math.max(0.01, Math.round(weightKg * 1000) / 1000)}</weight>
			<dimensions>
				<length>${Math.max(1, lengthCm)}</length>
				<width>${Math.max(1, widthCm)}</width>
				<height>${Math.max(1, heightCm)}</height>
			</dimensions>
		</parcel-characteristics>
		<print-preferences>
			<output-format>4x6</output-format>
			<encoding>PDF</encoding>
		</print-preferences>
		${customsXml}
		<preferences>
			<show-packing-instructions>false</show-packing-instructions>
		</preferences>
		<settlement-info>
			<paid-by-customer>${customerNumber}</paid-by-customer>
			${contractId ? `<contract-id>${contractId}</contract-id>` : ''}
			<intended-method-of-payment>${contractId ? 'Account' : 'CreditCard'}</intended-method-of-payment>
		</settlement-info>
	</delivery-spec>
</shipment>`;
}

// Map common service names to Canada Post service codes
function getServiceCode(serviceName: string): string {
	const lower = serviceName.toLowerCase();
	if (lower.includes('priority')) return 'DOM.PC';
	if (lower.includes('xpresspost') && lower.includes('international')) return 'INT.XP';
	if (lower.includes('xpresspost')) return 'DOM.XP';
	if (lower.includes('expedited') && lower.includes('usa')) return 'USA.EP';
	if (lower.includes('expedited')) return 'DOM.EP';
	if (lower.includes('regular') && lower.includes('usa')) return 'USA.PW.ENV';
	if (lower.includes('regular')) return 'DOM.RP';
	if (lower.includes('small packet') && lower.includes('usa')) return 'USA.SP.AIR';
	if (lower.includes('small packet') && lower.includes('surface')) return 'INT.SP.SURF';
	if (lower.includes('small packet') && lower.includes('air')) return 'INT.SP.AIR';
	if (lower.includes('tracked packet') && lower.includes('usa')) return 'USA.TP';
	if (lower.includes('tracked packet')) return 'INT.TP';
	if (lower.includes('surface') && lower.includes('international')) return 'INT.SP.SURF';
	if (lower.includes('air') && lower.includes('international')) return 'INT.SP.AIR';
	// Default to regular parcel
	return 'DOM.RP';
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) throw error(401, 'Not logged in');

	const { orderId } = await request.json();
	if (!orderId) throw error(400, 'Order ID required');

	const order = await db.query.warehouseOrder.findFirst({
		where: eq(warehouseOrder.id, orderId),
		with: {
			items: {
				with: {
					warehouseItem: true
				}
			}
		}
	});

	if (!order) throw error(404, 'Order not found');

	// If the order already has a label, re-fetch and return it as base64
	if (order.labelUrl) {
		let labelUrl = order.labelUrl;
		if (!labelUrl.startsWith('data:')) {
			console.log('Fetching label from:', labelUrl);
			const labelRes = await fetch(labelUrl);
			console.log('Label fetch status:', labelRes.status, labelRes.statusText);
			if (labelRes.ok) {
				const labelBuffer = await labelRes.arrayBuffer();
				console.log('Label PDF size:', labelBuffer.byteLength, 'bytes');
				labelUrl = `data:application/pdf;base64,${arrayBufferToBase64(labelBuffer)}`;
			} else {
				const errBody = await labelRes.text();
				console.error('Label fetch failed:', errBody);
				throw error(502, `Failed to fetch label PDF: ${labelRes.status}`);
			}
		}
		return json({
			trackingNumber: order.trackingNumber,
			labelUrl,
			packingSlipBase64: buildPackingSlipBase64(order),
			shippingMethod: order.shippingMethod || ''
		});
	}

	// Calculate package totals from items
	let totalWeight = 0;
	let maxLength = 0;
	let maxWidth = 0;
	let totalHeight = 0;

	for (const oi of order.items) {
		const item = oi.warehouseItem;
		totalWeight += item.weightGrams * oi.quantity;
		maxLength = Math.max(maxLength, item.lengthIn);
		maxWidth = Math.max(maxWidth, item.widthIn);
		totalHeight += item.heightIn * oi.quantity;
	}

	const packingSlipBase64 = buildPackingSlipBase64(order);

	let trackingNumber: string | null = null;
	let labelUrl: string | null = null;
	let shippingMethod: string;

	if (isLettermail(order.estimatedServiceName)) {
		// ── LETTERMAIL PATH: Use Theseus/mail.hackclub.com ──
		shippingMethod = 'lettermail';

		const theseusApiKey = env.THESEUS_API_KEY;
		const theseusQueueSlug = env.THESEUS_QUEUE_SLUG;
		
		if (!theseusApiKey || !theseusQueueSlug) {
			throw error(500, 'Theseus API not configured (THESEUS_API_KEY and THESEUS_QUEUE_SLUG required)');
		}

		const theseusBody = {
			address: {
				first_name: order.firstName,
				last_name: order.lastName,
				line_1: order.addressLine1,
				line_2: order.addressLine2 || undefined,
				city: order.city,
				state: order.stateProvince,
				postal_code: order.postalCode || undefined,
				country: order.country
			},
			idempotency_key: `warehouse-order-${order.id}`,
			metadata: {
				warehouse_order_id: order.id,
				fulfillment_id: order.fulfillmentId
			}
		};

		const theseusUrl = `${env.THESEUS_BASE_URL || 'https://mail.hackclub.com'}/api/v1/letter_queues/instant/${theseusQueueSlug}`;

		const theseusRes = await fetch(theseusUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${theseusApiKey}`
			},
			body: JSON.stringify(theseusBody)
		});

		if (!theseusRes.ok) {
			const errBody = await theseusRes.text();
			console.error('Theseus API error:', errBody);
			throw error(502, `Lettermail label creation failed: ${theseusRes.status}`);
		}

		const theseusData = await theseusRes.json();
		trackingNumber = theseusData.id || null;
		const rawLabelUrl = theseusData.label_url || null;

		// Fetch the label PDF and convert to base64 data URL so the frontend can print it via qz-tray
		if (rawLabelUrl) {
			try {
				const labelRes = await fetch(rawLabelUrl);
				if (labelRes.ok) {
					const labelBuffer = await labelRes.arrayBuffer();
					const labelBase64 = arrayBufferToBase64(labelBuffer);
					labelUrl = `data:application/pdf;base64,${labelBase64}`;
				} else {
					labelUrl = rawLabelUrl;
				}
			} catch {
				labelUrl = rawLabelUrl;
			}
		}

		// Mark the letter as printed in Theseus
		if (trackingNumber) {
			const theseusBaseUrl = env.THESEUS_BASE_URL || 'https://mail.hackclub.com';
			await fetch(`${theseusBaseUrl}/api/v1/letters/${trackingNumber}/mark_printed`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${theseusApiKey}` }
			}).catch((e) => console.error('Failed to mark Theseus letter as printed:', e));
		}

	} else {
		// ── CANADA POST PARCEL PATH ──
		shippingMethod = 'canada_post';

		const cpUsername = env.CP_API_USERNAME;
		const cpPassword = env.CP_API_PASSWORD;
		const customerNumber = env.CP_CUSTOMER_NUMBER;

		if (!cpUsername || !cpPassword || !customerNumber) {
			throw error(500, 'Canada Post API not configured');
		}

		const weightKg = totalWeight * GRAMS_TO_KG;
		const lengthCm = inchesToCm(maxLength);
		const widthCm = inchesToCm(maxWidth);
		const heightCm = inchesToCm(totalHeight);

		const serviceCode = getServiceCode(order.estimatedServiceName || '');
		const shipmentXml = buildCreateShipmentXML(order, weightKg, lengthCm, widthCm, heightCm, serviceCode);

		const cpBaseUrl = env.CP_ENVIRONMENT === 'production'
			? 'https://soa-gw.canadapost.ca'
			: 'https://ct.soa-gw.canadapost.ca';

		const mobo = customerNumber;
		const cpEndpoint = `${cpBaseUrl}/rs/${customerNumber}/${mobo}/shipment`;
		const authString = btoa(`${cpUsername}:${cpPassword}`);

		const cpRes = await fetch(cpEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/vnd.cpc.shipment-v8+xml',
				Accept: 'application/vnd.cpc.shipment-v8+xml',
				Authorization: `Basic ${authString}`,
				'Accept-language': 'en-CA'
			},
			body: shipmentXml
		});

		if (!cpRes.ok) {
			const errText = await cpRes.text();
			console.error('Canada Post Create Shipment error:', errText);
			throw error(502, `Canada Post shipment creation failed: ${cpRes.status}`);
		}

		const cpXml = await cpRes.text();
		const parser = new xml2js.Parser({ explicitArray: false });
		const cpResult = await parser.parseStringPromise(cpXml);
		const shipmentInfo = cpResult['shipment-info'];

		trackingNumber = shipmentInfo?.['tracking-pin'] || null;

		// Find the label link
		const links = shipmentInfo?.links?.link;
		if (links) {
			const linkArray = Array.isArray(links) ? links : [links];
			const labelLink = linkArray.find((l: any) => l.$?.rel === 'label');
			if (labelLink?.$?.href) {
				// Fetch the label PDF from Canada Post
				const labelRes = await fetch(labelLink.$.href, {
					headers: {
						Accept: 'application/pdf',
						Authorization: `Basic ${authString}`
					}
				});
				if (labelRes.ok) {
					const labelBuffer = await labelRes.arrayBuffer();
					const labelBase64 = arrayBufferToBase64(labelBuffer);
					// Store as data URL for direct use
					labelUrl = `data:application/pdf;base64,${labelBase64}`;
				}
			}
		}
	}

	// Update the order with tracking info
	await db.update(warehouseOrder)
		.set({
			trackingNumber,
			labelUrl,
			shippingMethod,
			status: 'SHIPPED',
			updatedAt: new Date()
		})
		.where(eq(warehouseOrder.id, orderId));

	return json({
		trackingNumber,
		labelUrl,
		packingSlipBase64,
		shippingMethod
	});
};
