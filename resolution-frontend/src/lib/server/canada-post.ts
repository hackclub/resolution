import { env } from '$env/dynamic/private';
import xml2js from 'xml2js';
import { PDFDocument } from 'pdf-lib';

export const INCHES_TO_CM = 2.54;
export const GRAMS_TO_KG = 0.001;

export function escapeXml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

async function cropLabelTo4x6(pdfBuffer: ArrayBuffer): Promise<ArrayBuffer> {
	const srcDoc = await PDFDocument.load(pdfBuffer);
	const newDoc = await PDFDocument.create();
	const [srcPage] = await newDoc.copyPages(srcDoc, [0]);

	// 8.5x11 page: 612 x 792 points (72pt per inch)
	// Label content is in the right half, starting ~1.35" from top, ~6.57" tall
	// Center a 4"x6" crop around the content
	// Horizontal: content centered between 4.35" and 8.25" → center at 6.3"
	// Crop 4" wide: 6.3" - 2" = 4.3" to 6.3" + 2" = 8.3"
	const cropX = 4.3 * 72;   // ~310pt
	const cropWidth = 4 * 72;  // 288pt = 4 inches
	// Vertical: content from 1.35" to 7.92" → center at 4.635"
	// Crop 6" tall: 4.635" - 3" = 1.635" to 4.635" + 3" = 7.635"
	const topInches = 1.35;
	const cropHeight = 6 * 72; // 432pt = 6 inches
	const cropY = 792 - (topInches * 72) - cropHeight; // PDF y is bottom-up

	srcPage.setCropBox(cropX, cropY, cropWidth, cropHeight);
	srcPage.setMediaBox(cropX, cropY, cropWidth, cropHeight);
	srcPage.setSize(cropWidth, cropHeight);

	newDoc.addPage(srcPage);
	return await newDoc.save();
}

export function inchesToCm(inches: number): number {
	return Math.round(inches * INCHES_TO_CM * 10) / 10;
}

export function isLettermail(serviceName: string | null): boolean {
	if (!serviceName) return false;
	const lower = serviceName.toLowerCase();
	return lower.includes('lettermail') || lower.includes('bubble packet');
}

export function buildDestinationXml(country: string, postalCode?: string, stateCode?: string): string {
	if (country === 'CA') {
		return `<domestic>
			<postal-code>${(postalCode ?? '').replace(/\s/g, '').toUpperCase()}</postal-code>
		</domestic>`;
	} else if (country === 'US') {
		return `<united-states>
			<zip-code>${(postalCode ?? '').replace(/\s/g, '')}</zip-code>
			${stateCode ? `<state-code>${escapeXml(stateCode)}</state-code>` : ''}
		</united-states>`;
	} else {
		return `<international>
			<country-code>${escapeXml(country)}</country-code>
			${postalCode ? `<postal-code>${escapeXml(postalCode)}</postal-code>` : ''}
		</international>`;
	}
}

export function buildRateRequestXml(params: {
	originPostal: string;
	country: string;
	postalCode?: string;
	weightKg: number;
	lengthCm: number;
	widthCm: number;
	heightCm: number;
}): string {
	const { originPostal, country, postalCode, weightKg, lengthCm, widthCm, heightCm } = params;
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
    ${buildDestinationXml(country, postalCode)}
  </destination>
</mailing-scenario>`;
}

export function buildCreateShipmentXml(params: {
	order: any;
	weightKg: number;
	lengthCm: number;
	widthCm: number;
	heightCm: number;
	serviceCode: string;
}): string {
	const { order, weightKg, lengthCm, widthCm, heightCm, serviceCode } = params;
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
			<state-code>${escapeXml(order.stateProvince)}</state-code>
		</united-states>`;
	} else {
		destinationXml = `<international>
			<country-code>${escapeXml(order.country)}</country-code>
			${order.postalCode ? `<postal-code>${escapeXml(order.postalCode)}</postal-code>` : ''}
		</international>`;
	}

	let customsXml = '';
	if (order.country !== 'CA') {
		const items = (order.items || []).filter((oi: any) => oi.warehouseItem);
		let skuLines: string;
		if (items.length > 0) {
			skuLines = items.map((oi: any) => {
				const item = oi.warehouseItem;
				const unitWeightKg = Math.round(item.weightGrams * GRAMS_TO_KG * 1000) / 1000;
				const valuePerUnit = Math.round(item.costCents) / 100;
				return `<item>
				<customs-number-of-units>${oi.quantity}</customs-number-of-units>
				<customs-description>${escapeXml(item.name.substring(0, 44))}</customs-description>
				<sku>${escapeXml(item.sku || '')}</sku>
				<hs-tariff-code>${escapeXml(item.hsCode || '')}</hs-tariff-code>
				<unit-weight>${unitWeightKg}</unit-weight>
				<customs-value-per-unit>${valuePerUnit.toFixed(2)}</customs-value-per-unit>
				<country-of-origin>CA</country-of-origin>
			</item>`;
			}).join('\n');
		} else {
			skuLines = `<item>
				<customs-number-of-units>1</customs-number-of-units>
				<customs-description>Merchandise</customs-description>
				<unit-weight>${Math.max(0.01, Math.round(weightKg * 1000) / 1000)}</unit-weight>
				<customs-value-per-unit>1.00</customs-value-per-unit>
				<country-of-origin>CA</country-of-origin>
			</item>`;
		}

		customsXml = `<customs>
			<currency>CAD</currency>
			<reason-for-export>SOG</reason-for-export>
			<other-reason>Merchandise</other-reason>
			<sku-list>${skuLines}</sku-list>
		</customs>`;
	}

	const deliverySpecXml = `<delivery-spec>
		<service-code>${escapeXml(serviceCode)}</service-code>
		<sender>
			<name>${escapeXml(env.CP_SENDER_NAME || 'Hack Club')}</name>
			<company>${escapeXml(env.CP_SENDER_NAME || 'Hack Club')}</company>
			<contact-phone>${escapeXml(env.CP_SENDER_PHONE || '000-000-0000')}</contact-phone>
			<address-details>
				<address-line-1>${escapeXml(env.CP_SENDER_ADDRESS || '')}</address-line-1>
				${env.CP_SENDER_ADDRESS_2 ? `<address-line-2>${escapeXml(env.CP_SENDER_ADDRESS_2)}</address-line-2>` : ''}
				<city>${escapeXml(env.CP_SENDER_CITY || '')}</city>
				<prov-state>${escapeXml(env.CP_SENDER_PROVINCE || '')}</prov-state>
				${contractId ? '<country-code>CA</country-code>' : ''}
				<postal-zip-code>${originPostal}</postal-zip-code>
			</address-details>
		</sender>
		<destination>
			<name>${escapeXml(order.firstName)} ${escapeXml(order.lastName)}</name>
			<client-voice-number>${escapeXml(order.phone || env.CP_SENDER_PHONE || '000-000-0000')}</client-voice-number>
			<address-details>
				<address-line-1>${escapeXml(order.addressLine1)}</address-line-1>
				${order.addressLine2 ? `<address-line-2>${escapeXml(order.addressLine2)}</address-line-2>` : ''}
				<city>${escapeXml(order.city)}</city>
				<prov-state>${escapeXml(order.stateProvince)}</prov-state>
				<country-code>${escapeXml(order.country)}</country-code>
				<postal-zip-code>${(order.postalCode ?? '').replace(/\s/g, '').toUpperCase()}</postal-zip-code>
			</address-details>
		</destination>
		${order.country !== 'CA' ? `<options>
			<option>
				<option-code>RTS</option-code>
			</option>
		</options>` : ''}
		<parcel-characteristics>
			<weight>${Math.max(0.01, Math.round(weightKg * 1000) / 1000)}</weight>
			<dimensions>
				<length>${Math.max(1, lengthCm)}</length>
				<width>${Math.max(1, widthCm)}</width>
				<height>${Math.max(1, heightCm)}</height>
			</dimensions>
		</parcel-characteristics>
		${contractId ? `<print-preferences>
			<output-format>4x6</output-format>
			<encoding>PDF</encoding>
		</print-preferences>` : ''}
		<preferences>
			<show-packing-instructions>false</show-packing-instructions>
		</preferences>
		${customsXml}
		${contractId ? `<settlement-info>
			<paid-by-customer>${customerNumber}</paid-by-customer>
			<contract-id>${contractId}</contract-id>
			<intended-method-of-payment>Account</intended-method-of-payment>
		</settlement-info>` : ''}
	</delivery-spec>`;

	if (contractId) {
		return `<?xml version="1.0" encoding="UTF-8"?>
<shipment xmlns="http://www.canadapost.ca/ws/shipment-v8">
	<transmit-shipment/>
	<requested-shipping-point>${originPostal}</requested-shipping-point>
	<provide-pricing-info>true</provide-pricing-info>
	${deliverySpecXml}
</shipment>`;
	}

	return `<?xml version="1.0" encoding="UTF-8"?>
<non-contract-shipment xmlns="http://www.canadapost.ca/ws/ncshipment-v4">
	<requested-shipping-point>${originPostal}</requested-shipping-point>
	${deliverySpecXml}
</non-contract-shipment>`;
}

export function getServiceCode(serviceName: string): string {
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
	return 'DOM.RP';
}

export interface RateOption {
	serviceName: string;
	serviceCode: string;
	priceDetails: { base: number; gst: number; pst: number; hst: number; total: number };
	deliveryDate: string;
	transitDays: string;
	currency: string;
}

interface LetterMailOption {
	serviceName: string;
	serviceCode: string;
	priceDetails: { base: number; gst: number; pst: number; hst: number; total: number };
	deliveryDate: string;
	transitDays: string;
	isLettermail: boolean;
	note: string;
}

export function getLetterMailOptions(
	weightGrams: number,
	lengthCm: number,
	widthCm: number,
	heightCm: number,
	country: string
): LetterMailOption[] {
	const options: LetterMailOption[] = [];

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
		options.push({
			serviceName: `Lettermail ${countryLabel} (up to 30g)`,
			serviceCode: 'LETTERMAIL.STD',
			priceDetails: { base: price, gst: 0, pst: 0, hst: 0, total: price },
			deliveryDate: 'N/A',
			transitDays: country === 'CA' ? '2-4' : country === 'US' ? '4-7' : '7-14',
			isLettermail: true,
			note: 'Max: 245mm x 156mm x 5mm'
		});
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
			else price = 25.80;
		}

		options.push({
			serviceName: `Bubble Packet ${countryLabel} (up to 500g)`,
			serviceCode: 'BUBBLE.PACKET',
			priceDetails: { base: price, gst: 0, pst: 0, hst: 0, total: price },
			deliveryDate: 'N/A',
			transitDays: country === 'CA' ? '2-5' : country === 'US' ? '5-10' : '10-21',
			isLettermail: true,
			note: 'Max: 380mm x 270mm x 20mm'
		});
	}

	return options;
}

export function getCanadaPostConfig(): { baseUrl: string; authHeader: string; customerNumber: string } {
	const username = env.CP_API_USERNAME;
	const password = env.CP_API_PASSWORD;
	const customerNumber = env.CP_CUSTOMER_NUMBER;

	if (!username || !password || !customerNumber) {
		throw new Error('Canada Post API not configured (CP_API_USERNAME, CP_API_PASSWORD, CP_CUSTOMER_NUMBER required)');
	}

	const baseUrl = env.CP_ENVIRONMENT === 'production'
		? 'https://soa-gw.canadapost.ca'
		: 'https://ct.soa-gw.canadapost.ca';

	const authHeader = `Basic ${btoa(`${username}:${password}`)}`;

	return { baseUrl, authHeader, customerNumber };
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

export async function fetchRates(params: {
	country: string;
	postalCode?: string;
	weightKg: number;
	lengthCm: number;
	widthCm: number;
	heightCm: number;
}): Promise<RateOption[]> {
	const { baseUrl, authHeader } = getCanadaPostConfig();
	const originPostal = env.CP_ORIGIN_POSTAL_CODE;
	if (!originPostal) {
		throw new Error('CP_ORIGIN_POSTAL_CODE is required');
	}

	const xmlBody = buildRateRequestXml({
		originPostal,
		country: params.country,
		postalCode: params.postalCode,
		weightKg: params.weightKg,
		lengthCm: params.lengthCm,
		widthCm: params.widthCm,
		heightCm: params.heightCm
	});

	const response = await fetch(`${baseUrl}/rs/ship/price`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/vnd.cpc.ship.rate-v4+xml',
			Accept: 'application/vnd.cpc.ship.rate-v4+xml',
			Authorization: authHeader,
			'Accept-language': 'en-CA'
		},
		body: xmlBody
	});

	const xmlResponse = await response.text();

	if (!response.ok) {
		console.error('Canada Post API error:', xmlResponse);
		return [];
	}

	const parser = new xml2js.Parser({ explicitArray: false });
	const result = await parser.parseStringPromise(xmlResponse);
	const cadToUsd = 0.73;
	const handlingFee = 2.0;

	const priceQuotes = result['price-quotes'] as { 'price-quote'?: PriceQuote | PriceQuote[] } | undefined;
	if (!priceQuotes?.['price-quote']) return [];

	let quotes = priceQuotes['price-quote'];
	if (!Array.isArray(quotes)) quotes = [quotes];

	return quotes.map((quote) => {
		const priceDetails = quote['price-details'];
		const taxes = priceDetails.taxes ?? {};
		const baseTotalCAD = parseFloat(priceDetails.due ?? '0');
		const totalCAD = baseTotalCAD + handlingFee;
		const totalUSD = Math.round(totalCAD * cadToUsd * 100) / 100;

		return {
			serviceName: quote['service-name'],
			serviceCode: quote['service-code'],
			priceDetails: {
				base: Math.round(parseFloat(priceDetails.base ?? '0') * cadToUsd * 100) / 100,
				gst: Math.round(getTaxValue(taxes.gst) * cadToUsd * 100) / 100,
				pst: Math.round(getTaxValue(taxes.pst) * cadToUsd * 100) / 100,
				hst: Math.round(getTaxValue(taxes.hst) * cadToUsd * 100) / 100,
				total: totalUSD
			},
			deliveryDate: quote['service-standard']?.['expected-delivery-date'] ?? 'N/A',
			transitDays: quote['service-standard']?.['expected-transit-time'] ?? 'N/A',
			currency: 'USD'
		};
	});
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

export async function createShipment(params: {
	order: any;
	weightKg: number;
	lengthCm: number;
	widthCm: number;
	heightCm: number;
	serviceCode: string;
}): Promise<{ trackingPin: string | null; labelBase64: string | null }> {
	const { baseUrl, authHeader, customerNumber } = getCanadaPostConfig();

	const shipmentXml = buildCreateShipmentXml(params);
	console.log('Shipment XML:', shipmentXml);

	const contractId = env.CP_CONTRACT_ID;
	const cpEndpoint = contractId
		? `${baseUrl}/rs/${customerNumber}/${customerNumber}/shipment`
		: `${baseUrl}/rs/${customerNumber}/ncshipment`;

	const maxRetries = 3;
	let cpRes: Response | null = null;
	for (let attempt = 0; attempt < maxRetries; attempt++) {
		cpRes = await fetch(cpEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': contractId ? 'application/vnd.cpc.shipment-v8+xml' : 'application/vnd.cpc.ncshipment-v4+xml',
				Accept: contractId ? 'application/vnd.cpc.shipment-v8+xml' : 'application/vnd.cpc.ncshipment-v4+xml',
				Authorization: authHeader,
				'Accept-language': 'en-CA',
				...(params.order.country === 'US' && env.ZONOS_ACCOUNT_KEY ? { 'X-CPC-Zonos-Key': env.ZONOS_ACCOUNT_KEY } : {})
			},
			body: shipmentXml
		});

		if (cpRes.ok || cpRes.status < 500) break;

		const errText = await cpRes.text();
		console.error(`Canada Post Create Shipment error (attempt ${attempt + 1}/${maxRetries}):`, errText);
		if (attempt < maxRetries - 1) {
			await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
		}
	}

	if (!cpRes!.ok) {
		const errText = await cpRes!.text();
		console.error('Canada Post Create Shipment error:', errText);
		throw new Error(`Canada Post shipment creation failed: ${cpRes!.status}`);
	}

	const cpXml = await cpRes!.text();
	const parser = new xml2js.Parser({ explicitArray: false });
	const cpResult = await parser.parseStringPromise(cpXml);
	const shipmentInfo = cpResult['shipment-info'] || cpResult['non-contract-shipment-info'];

	const trackingPin: string | null = shipmentInfo?.['tracking-pin'] || null;
	let labelBase64: string | null = null;

	const links = shipmentInfo?.links?.link;
	if (links) {
		const linkArray = Array.isArray(links) ? links : [links];
		const labelLink = linkArray.find((l: any) => l.$?.rel === 'label');
		if (labelLink?.$?.href) {
			const labelRes = await fetch(labelLink.$.href, {
				headers: {
					Accept: 'application/pdf',
					Authorization: authHeader
				}
			});
			if (labelRes.ok) {
				let labelBuffer = await labelRes.arrayBuffer();
				if (!contractId) {
					labelBuffer = await cropLabelTo4x6(labelBuffer);
				}
				labelBase64 = `data:application/pdf;base64,${arrayBufferToBase64(labelBuffer)}`;
			}
		}
	}

	return { trackingPin, labelBase64 };
}

export interface ZonosDutyResult {
	duties: number;
	taxes: number;
	fees: number;
	total: number;
	currency: string;
}

export async function calculateZonosDuties(params: {
	items: Array<{ hsCode: string; valueCadCents: number; quantity: number; sku: string; description: string }>;
	shippingCostCad: number;
	destinationAddress: { city: string; state: string; postalCode: string; country: string };
	serviceLevelCode?: string;
}): Promise<ZonosDutyResult | null> {
	const credentialToken = env.ZONOS_CREDENTIAL_TOKEN;
	if (!credentialToken) return null;

	const originPostal = (env.CP_ORIGIN_POSTAL_CODE || '').replace(/\s/g, '').toUpperCase();

	const parties = [
		{
			type: 'ORIGIN',
			location: {
				countryCode: 'CA',
				postalCode: originPostal
			}
		},
		{
			type: 'DESTINATION',
			location: {
				countryCode: params.destinationAddress.country,
				administrativeArea: params.destinationAddress.state,
				city: params.destinationAddress.city,
				postalCode: params.destinationAddress.postalCode
			}
		}
	];

	const items = params.items.map((item) => ({
		amount: item.valueCadCents / 100,
		currencyCode: 'CAD',
		quantity: item.quantity,
		hsCode: item.hsCode || undefined,
		sku: item.sku || undefined,
		description: item.description,
		countryOfOrigin: 'CA',
		productId: item.sku || undefined
	}));

	const shipmentRating = [
		{
			amount: params.shippingCostCad,
			currencyCode: 'CAD',
			serviceLevelCode: params.serviceLevelCode || 'standard'
		}
	];

	const landedCostConfig = {
		calculationMethod: 'DDP_PREFERRED',
		endUse: 'NOT_FOR_RESALE',
		tariffRate: 'ZONOS_PREFERRED'
	};

	const query = `mutation CalculateLandedCost($parties: [PartyCreateWorkflowInput!]!, $items: [ItemCreateWorkflowInput!]!, $shipmentRating: [ShipmentRatingCreateWorkflowInput!]!, $landedCostConfig: LandedCostWorkFlowInput!) {
  partyCreateWorkflow(input: $parties) { id type }
  itemCreateWorkflow(input: $items) { id amount }
  shipmentRatingCreateWorkflow(input: $shipmentRating) { id amount }
  landedCostCalculateWorkflow(input: $landedCostConfig) { id duties { amount currency } taxes { amount currency } fees { amount currency } }
}`;

	try {
		const res = await fetch('https://api.zonos.com/graphql', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				credentialToken
			},
			body: JSON.stringify({
				query,
				variables: { parties, items, shipmentRating, landedCostConfig }
			})
		});

		if (!res.ok) {
			console.error('Zonos API error:', res.status, await res.text());
			return null;
		}

		const result = await res.json();

		if (result.errors) {
			console.error('Zonos GraphQL errors:', result.errors);
			return null;
		}

		const landedCost = result.data?.landedCostCalculateWorkflow;
		if (!landedCost) return null;

		const sumAmounts = (arr: Array<{ amount: number }> | undefined) =>
			(arr || []).reduce((sum, entry) => sum + (entry.amount || 0), 0);

		const duties = sumAmounts(landedCost.duties);
		const taxes = sumAmounts(landedCost.taxes);
		const fees = sumAmounts(landedCost.fees);

		return {
			duties: Math.round(duties * 100) / 100,
			taxes: Math.round(taxes * 100) / 100,
			fees: Math.round(fees * 100) / 100,
			total: Math.round((duties + taxes + fees) * 100) / 100,
			currency: 'USD'
		};
	} catch (err) {
		console.error('Zonos API request failed:', err);
		return null;
	}
}

export async function fetchCheapestRate(params: {
	country: string;
	postalCode?: string;
	weightGrams: number;
	lengthIn: number;
	widthIn: number;
	heightIn: number;
	packageType: string;
}): Promise<{ serviceName: string; shippingCostUsd: number } | null> {
	const originPostal = env.CP_ORIGIN_POSTAL_CODE;
	if (!originPostal || !env.CP_API_USERNAME || !env.CP_API_PASSWORD || !env.CP_CUSTOMER_NUMBER) {
		return null;
	}

	let effectiveLength = params.lengthIn;
	let effectiveWidth = params.widthIn;
	let effectivePackageType = params.packageType;
	if (params.packageType === 'flat' || params.packageType === 'envelope') {
		const l = Math.max(params.lengthIn, params.widthIn);
		const w = Math.min(params.lengthIn, params.widthIn);
		if (l <= 6 && w <= 4) { effectiveLength = 6; effectiveWidth = 4; }
		else if (l <= 9 && w <= 6) { effectiveLength = 9; effectiveWidth = 6; }
		else { effectiveLength = l; effectiveWidth = w; effectivePackageType = 'box'; }
	}

	const lengthCm = inchesToCm(effectiveLength);
	const widthCm = inchesToCm(effectiveWidth);
	const heightCm = effectivePackageType === 'box'
		? inchesToCm(params.packageType === 'box' ? params.heightIn : 0.5)
		: 0.5;

	const allOptions: Array<{ serviceName: string; total: number }> = [];

	const lettermailOpts = getLetterMailOptions(params.weightGrams, lengthCm, widthCm, heightCm, params.country);
	for (const opt of lettermailOpts) {
		allOptions.push({ serviceName: opt.serviceName, total: opt.priceDetails.total });
	}

	try {
		const parcelRates = await fetchRates({
			country: params.country,
			postalCode: params.postalCode,
			weightKg: params.weightGrams * GRAMS_TO_KG,
			lengthCm,
			widthCm,
			heightCm
		});
		for (const rate of parcelRates) {
			allOptions.push({ serviceName: rate.serviceName, total: rate.priceDetails.total });
		}
	} catch (err) {
		console.error('Parcel rate lookup failed:', err);
	}

	if (allOptions.length === 0) return null;

	allOptions.sort((a, b) => a.total - b.total);
	return { serviceName: allOptions[0].serviceName, shippingCostUsd: allOptions[0].total };
}
