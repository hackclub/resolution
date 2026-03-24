import { env } from '$env/dynamic/private';
import type { RateOption } from './canada-post';

function formatHsCode(code: string | null | undefined): string {
	if (!code) return '9505100000';
	const digits = code.replace(/[^0-9]/g, '');
	if (digits.length === 0) return '9505100000';
	return digits.padEnd(10, '0').substring(0, 10);
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

export function getChitChatsConfig(): { baseUrl: string; accessToken: string; clientId: string } {
	const accessToken = env.CHITCHATS_ACCESS_TOKEN;
	const clientId = env.CHITCHATS_CLIENT_ID;

	if (!accessToken || !clientId) {
		throw new Error('Chit Chats not configured: CHITCHATS_ACCESS_TOKEN and CHITCHATS_CLIENT_ID required');
	}

	return {
		baseUrl: `https://chitchats.com/api/v1/clients/${clientId}`,
		accessToken,
		clientId
	};
}

export async function createChitChatsShipment(params: {
	order: any;
	weightGrams: number;
	lengthIn: number;
	widthIn: number;
	heightIn: number;
}): Promise<{ trackingNumber: string | null; labelBase64: string | null; shipmentId: string }> {
	const { baseUrl, accessToken } = getChitChatsConfig();
	const { order, weightGrams, lengthIn, widthIn, heightIn } = params;

	const items = (order.items || []).filter((oi: any) => oi.warehouseItem);
	const totalValue = items.length > 0
		? items.reduce((sum: number, oi: any) => sum + (oi.warehouseItem.costCents / 100) * oi.quantity, 0).toFixed(2)
		: '1.00';

	const isThickEnvelope = lengthIn <= 15 && widthIn <= 10 && heightIn <= 1;
	const packageType = isThickEnvelope ? 'thick_envelope' : 'parcel';

	const shipmentBody: Record<string, any> = {
		name: `${order.firstName} ${order.lastName}`,
		address_1: order.addressLine1,
		address_2: order.addressLine2 || undefined,
		city: order.city,
		province_code: order.stateProvince,
		postal_code: order.postalCode || '',
		country_code: order.country,
		package_contents: 'merchandise',
		value: totalValue,
		value_currency: 'cad',
		package_type: packageType,
		weight_unit: 'g',
		weight: weightGrams,
		size_unit: 'in',
		size_x: lengthIn,
		size_y: widthIn,
		size_z: heightIn,
		postage_type: 'unknown',
		ship_date: 'today',
		line_items: items.map((oi: any) => ({
			quantity: oi.quantity,
			description: oi.warehouseItem.name,
			value_amount: (oi.warehouseItem.costCents / 100).toFixed(2),
			currency_code: 'cad',
			origin_country: 'CA',
			hs_tariff_code: formatHsCode(oi.warehouseItem.hsCode),
			weight: oi.warehouseItem.weightGrams * oi.quantity,
			weight_unit: 'g',
			manufacturer_id: 'HACKCLUB',
			manufacturer_contact: env.CP_SENDER_NAME || 'Hack Club',
			manufacturer_street: env.CP_SENDER_ADDRESS || '',
			manufacturer_city: env.CP_SENDER_CITY || '',
			manufacturer_postal_code: (env.CP_ORIGIN_POSTAL_CODE || '').replace(/\s/g, ''),
			manufacturer_province_code: env.CP_SENDER_PROVINCE || '',
			manufacturer_country_code: 'CA'
		}))
	};

	// Create shipment
	const createRes = await fetch(`${baseUrl}/shipments`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: accessToken
		},
		body: JSON.stringify(shipmentBody)
	});

	if (!createRes.ok) {
		const errText = await createRes.text();
		console.error('Chit Chats Create Shipment error:', errText);
		throw new Error(`Chit Chats shipment creation failed: ${createRes.status}`);
	}

	const createData = await createRes.json();
	const shipment = createData.shipment || createData;
	const shipmentId = shipment.id;

	// Find cheapest rate
	const rates = shipment.rates || [];
	if (rates.length === 0) {
		throw new Error('No rates returned from Chit Chats');
	}

	const cheapestRate = rates.reduce((cheapest: any, rate: any) => {
		return parseFloat(rate.payment_amount) < parseFloat(cheapest.payment_amount) ? rate : cheapest;
	}, rates[0]);

	// Buy postage
	const buyRes = await fetch(`${baseUrl}/shipments/${shipmentId}/buy`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json',
			Authorization: accessToken
		},
		body: JSON.stringify({ postage_type: cheapestRate.postage_type })
	});

	if (!buyRes.ok) {
		const errText = await buyRes.text();
		console.error('Chit Chats Buy Postage error:', errText);
		throw new Error(`Chit Chats postage purchase failed: ${buyRes.status}`);
	}

	// Poll for ready status
	let finalShipment: any = null;
	for (let i = 0; i < 10; i++) {
		await new Promise((r) => setTimeout(r, 1000));

		const pollRes = await fetch(`${baseUrl}/shipments/${shipmentId}`, {
			headers: { Authorization: accessToken }
		});

		if (!pollRes.ok) {
			console.error('Chit Chats poll error:', pollRes.status);
			continue;
		}

		const pollData = await pollRes.json();
		finalShipment = pollData.shipment;

		if (finalShipment.status === 'ready' || finalShipment.status === 'postage_purchase_failed') {
			break;
		}
	}

	if (!finalShipment || finalShipment.status === 'postage_purchase_failed') {
		throw new Error('Chit Chats postage purchase failed');
	}

	// Fetch label PDF
	let labelBase64: string | null = null;
	if (finalShipment.postage_label_pdf_url) {
		try {
			const labelRes = await fetch(finalShipment.postage_label_pdf_url);
			if (labelRes.ok) {
				const labelBuffer = await labelRes.arrayBuffer();
				labelBase64 = `data:application/pdf;base64,${arrayBufferToBase64(labelBuffer)}`;
			} else {
				console.error('Chit Chats label fetch failed:', labelRes.status);
			}
		} catch (err) {
			console.error('Chit Chats label fetch error:', err);
		}
	}

	return {
		trackingNumber: finalShipment.carrier_tracking_code || null,
		labelBase64,
		shipmentId: String(shipmentId)
	};
}

export async function fetchChitChatsRates(params: {
	country: string;
	postalCode?: string;
	province?: string;
	name: string;
	address1: string;
	city: string;
	weightGrams: number;
	lengthIn: number;
	widthIn: number;
	heightIn: number;
	valueCad: number;
}): Promise<RateOption[]> {
	const { baseUrl, accessToken } = getChitChatsConfig();

	const isThickEnvelope = params.lengthIn <= 15 && params.widthIn <= 10 && params.heightIn <= 1;
	const packageType = isThickEnvelope ? 'thick_envelope' : 'parcel';

	const shipmentBody: Record<string, any> = {
		name: params.name,
		address_1: params.address1,
		city: params.city,
		province_code: params.province || '',
		postal_code: params.postalCode || '',
		country_code: params.country,
		package_contents: 'merchandise',
		value: params.valueCad.toFixed(2),
		value_currency: 'cad',
		package_type: packageType,
		weight_unit: 'g',
		weight: params.weightGrams,
		size_unit: 'in',
		size_x: params.lengthIn,
		size_y: params.widthIn,
		size_z: params.heightIn,
		postage_type: 'unknown',
		ship_date: 'today',
		description: 'Merchandise',
		line_items: [{
			quantity: 1,
			description: 'Merchandise',
			value_amount: params.valueCad.toFixed(2),
			currency_code: 'cad',
			origin_country: 'CA',
			hs_tariff_code: '9505100000',
			weight: params.weightGrams,
			weight_unit: 'g',
			manufacturer_id: 'HACKCLUB',
			manufacturer_contact: env.CP_SENDER_NAME || 'Hack Club',
			manufacturer_street: env.CP_SENDER_ADDRESS || '',
			manufacturer_city: env.CP_SENDER_CITY || '',
			manufacturer_postal_code: (env.CP_ORIGIN_POSTAL_CODE || '').replace(/\s/g, ''),
			manufacturer_province_code: env.CP_SENDER_PROVINCE || '',
			manufacturer_country_code: 'CA'
		}]
	};

	const createRes = await fetch(`${baseUrl}/shipments`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: accessToken
		},
		body: JSON.stringify(shipmentBody)
	});

	if (!createRes.ok) {
		const errText = await createRes.text();
		console.error('Chit Chats rate fetch error:', errText);
		throw new Error(`Chit Chats rate fetch failed: ${createRes.status}`);
	}

	const createData = await createRes.json();
	const shipment = createData.shipment || createData;
	const shipmentId = shipment.id;
	const rates = shipment.rates || [];

	const CAD_TO_USD = 0.73;

	const rateOptions: RateOption[] = rates.map((rate: any) => {
		const transitMatch = (rate.delivery_time_description || '').match(/(\d+)/);
		return {
			serviceName: rate.postage_description || rate.postage_type,
			serviceCode: `CHITCHATS.${rate.postage_type}`,
			priceDetails: {
				base: parseFloat(rate.purchase_amount || '0') * CAD_TO_USD,
				gst: parseFloat(rate.federal_tax || '0') * CAD_TO_USD,
				pst: parseFloat(rate.provincial_tax || '0') * CAD_TO_USD,
				hst: 0,
				total: parseFloat(rate.payment_amount || '0') * CAD_TO_USD
			},
			deliveryDate: 'N/A',
			transitDays: transitMatch ? transitMatch[0] : 'N/A',
			currency: 'USD'
		};
	});

	// Delete temporary shipment
	try {
		await fetch(`${baseUrl}/shipments/${shipmentId}`, {
			method: 'DELETE',
			headers: { Authorization: accessToken }
		});
	} catch (err) {
		console.error('Chit Chats cleanup error:', err);
	}

	return rateOptions;
}
