import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { requireAuth } from '$lib/server/auth/guard';
import { validateJson, shippingRateSchema } from '$lib/server/validation';
import { db } from '$lib/server/db';
import { ambassadorPathway } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import xml2js from 'xml2js';

const INCHES_TO_CM = 2.54;
const GRAMS_TO_KG = 0.001;

function inchesToCm(inches: number): number {
	return Math.round(inches * INCHES_TO_CM * 10) / 10;
}

function buildDestinationXML(country: string, postalCode?: string): string {
	if (country === 'CA') {
		return `<domestic>
      <postal-code>${(postalCode ?? '').replace(/\s/g, '').toUpperCase()}</postal-code>
    </domestic>`;
	} else if (country === 'US') {
		return `<united-states>
      <zip-code>${(postalCode ?? '').replace(/\s/g, '')}</zip-code>
    </united-states>`;
	} else {
		if (postalCode) {
			return `<international>
      <country-code>${country}</country-code>
      <postal-code>${postalCode}</postal-code>
    </international>`;
		}
		return `<international>
      <country-code>${country}</country-code>
    </international>`;
	}
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

function formatRatesResponse(parsedXml: Record<string, unknown>, cadToUsd: number) {
	const priceQuotes = parsedXml['price-quotes'] as { 'price-quote'?: PriceQuote | PriceQuote[] } | undefined;
	if (!priceQuotes?.['price-quote']) return [];

	let quotes = priceQuotes['price-quote'];
	if (!Array.isArray(quotes)) quotes = [quotes];

	return quotes.map((quote) => {
		const priceDetails = quote['price-details'];
		const taxes = priceDetails.taxes ?? {};
		const baseTotalCAD = parseFloat(priceDetails.due ?? '0');
		const handlingFee = 2.0;
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

function getLetterMailOptions(weightGrams: number, lengthCm: number, widthCm: number, heightCm: number, country: string) {
	const options: Array<{
		serviceName: string;
		serviceCode: string;
		priceDetails: { base: number; gst: number; pst: number; hst: number; total: number };
		deliveryDate: string;
		transitDays: string;
		isLettermail: boolean;
		note: string;
	}> = [];

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
			else price = 25.8;
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

export const POST: RequestHandler = async (event) => {
	const { user } = requireAuth(event);

	const assignments = await db
		.select()
		.from(ambassadorPathway)
		.where(eq(ambassadorPathway.userId, user.id));

	if (assignments.length === 0 && !user.isAdmin) {
		throw error(403, 'You are not an ambassador');
	}

	const data = await validateJson(shippingRateSchema, event.request);

	if ((data.country === 'CA' || data.country === 'US') && !data.postalCode) {
		throw error(400, 'Postal/ZIP code is required for Canadian and US destinations');
	}

	const originPostal = env.CP_ORIGIN_POSTAL_CODE;
	if (!originPostal || !env.CP_API_USERNAME || !env.CP_API_PASSWORD || !env.CP_CUSTOMER_NUMBER) {
		throw error(500, 'Canada Post API not configured');
	}

	const weightKg = data.weight * GRAMS_TO_KG;
	const lengthCm = inchesToCm(data.length);
	const widthCm = inchesToCm(data.width);
	const heightCm = data.packageType === 'box' ? inchesToCm(data.height) : 0.5;

	const lettermailOptions = getLetterMailOptions(data.weight, lengthCm, widthCm, heightCm, data.country);

	let parcelRates: ReturnType<typeof formatRatesResponse> = [];
	try {
		const cpEndpoint = env.CP_ENVIRONMENT === 'production'
			? 'https://soa-gw.canadapost.ca/rs/ship/price'
			: 'https://ct.soa-gw.canadapost.ca/rs/ship/price';

		const authString = btoa(`${env.CP_API_USERNAME}:${env.CP_API_PASSWORD}`);
		const xmlBody = buildRateRequestXML(originPostal, data.country, data.postalCode, weightKg, lengthCm, widthCm, heightCm);

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

		const xmlResponse = await response.text();

		if (!response.ok) {
			console.error('Canada Post API error:', xmlResponse);
		} else {
			const parser = new xml2js.Parser({ explicitArray: false });
			const result = await parser.parseStringPromise(xmlResponse);
			const cadToUsd = 0.73;
			parcelRates = formatRatesResponse(result, cadToUsd);
		}
	} catch (err) {
		console.error('Parcel rate lookup failed:', err);
	}

	const allRates = [...lettermailOptions, ...parcelRates];

	return json({
		rates: allRates,
		origin: originPostal,
		destination: {
			country: data.country,
			city: data.city,
			province: data.province,
			postalCode: data.postalCode
		}
	});
};
