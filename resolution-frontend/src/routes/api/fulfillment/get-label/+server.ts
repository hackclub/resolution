import { env } from '$env/dynamic/private';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { warehouseOrder } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import { GRAMS_TO_KG, inchesToCm, isLettermail, getServiceCode, createShipment } from '$lib/server/canada-post';

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

		const weightKg = totalWeight * GRAMS_TO_KG;
		const lengthCm = inchesToCm(maxLength);
		const widthCm = inchesToCm(maxWidth);
		const heightCm = inchesToCm(totalHeight);
		const serviceCode = getServiceCode(order.estimatedServiceName || '');
		console.log(`Creating shipment: country=${order.country}, estimatedService=${order.estimatedServiceName}, serviceCode=${serviceCode}`);

		try {
			const result = await createShipment({ order, weightKg, lengthCm, widthCm, heightCm, serviceCode });
			trackingNumber = result.trackingPin;
			labelUrl = result.labelBase64;
		} catch (e: any) {
			console.error('Canada Post Create Shipment error:', e.message);
			throw error(502, `Canada Post shipment creation failed`);
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
