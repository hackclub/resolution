import { env } from '$env/dynamic/private';
import xml2js from 'xml2js';

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
			<non-delivery>RASE</non-delivery>
		</customs>`;
	}

	return `<?xml version="1.0" encoding="UTF-8"?>
<shipment xmlns="http://www.canadapost.ca/ws/shipment-v8">
	<transmit-shipment/>
	<requested-shipping-point>${originPostal}</requested-shipping-point>
	<provide-pricing-info>true</provide-pricing-info>
	<delivery-spec>
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
				<country-code>CA</country-code>
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
		<preferences>
			<show-packing-instructions>false</show-packing-instructions>
		</preferences>
		${customsXml}
		<settlement-info>
			<paid-by-customer>${customerNumber}</paid-by-customer>
			${contractId ? `<contract-id>${contractId}</contract-id>` : ''}
			<intended-method-of-payment>${contractId ? 'Account' : 'CreditCard'}</intended-method-of-payment>
		</settlement-info>
	</delivery-spec>
</shipment>`;
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

	const cpEndpoint = `${baseUrl}/rs/${customerNumber}/${customerNumber}/shipment`;

	const cpRes = await fetch(cpEndpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/vnd.cpc.shipment-v8+xml',
			Accept: 'application/vnd.cpc.shipment-v8+xml',
			Authorization: authHeader,
			'Accept-language': 'en-CA'
		},
		body: shipmentXml
	});

	if (!cpRes.ok) {
		const errText = await cpRes.text();
		console.error('Canada Post Create Shipment error:', errText);
		throw new Error(`Canada Post shipment creation failed: ${cpRes.status}`);
	}

	const cpXml = await cpRes.text();
	const parser = new xml2js.Parser({ explicitArray: false });
	const cpResult = await parser.parseStringPromise(cpXml);
	const shipmentInfo = cpResult['shipment-info'];

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
				const labelBuffer = await labelRes.arrayBuffer();
				labelBase64 = `data:application/pdf;base64,${arrayBufferToBase64(labelBuffer)}`;
			}
		}
	}

	return { trackingPin, labelBase64 };
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
