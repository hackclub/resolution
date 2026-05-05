import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { requireAuth } from '$lib/server/auth/guard';
import { validateJson, shippingRateSchema } from '$lib/server/validation';
import { db } from '$lib/server/db';
import { ambassadorPathway } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { GRAMS_TO_KG, inchesToCm, fetchRates, getLetterMailOptions, calculateZonosDuties } from '$lib/server/canada-post';
import { getCadToUsdRate } from '$lib/server/exchange-rate';
import { fetchChitChatsRates } from '$lib/server/chit-chats';
import { selectPackaging } from '$lib/server/packaging';

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

	if (!env.CP_ORIGIN_POSTAL_CODE) {
		throw error(500, 'Canada Post API not configured');
	}

	const packaging = selectPackaging(
		data.items.map((it) => ({
			lengthIn: it.lengthIn,
			widthIn: it.widthIn,
			heightIn: it.heightIn,
			weightGrams: it.weightGrams,
			quantity: it.quantity
		}))
	);

	const weightKg = packaging.weightGrams * GRAMS_TO_KG;
	const lengthCm = inchesToCm(packaging.lengthIn);
	const widthCm = inchesToCm(packaging.widthIn);
	const heightCm = inchesToCm(packaging.heightIn);

	const lettermailOptions = getLetterMailOptions(packaging.weightGrams, lengthCm, widthCm, heightCm, data.country);

	let parcelRates: Array<{
		serviceName: string;
		serviceCode: string;
		priceDetails: { base: number; gst: number; pst: number; hst: number; total: number };
		deliveryDate: string;
		transitDays: string;
		currency: string;
	}> = [];
	try {
		parcelRates = await fetchRates({ country: data.country, postalCode: data.postalCode, weightKg, lengthCm, widthCm, heightCm });
	} catch (err) {
		console.error('Parcel rate lookup failed:', err);
	}

	let chitChatsRates: Array<{
		serviceName: string;
		serviceCode: string;
		priceDetails: { base: number; gst: number; pst: number; hst: number; total: number };
		deliveryDate: string;
		transitDays: string;
		currency: string;
	}> = [];
	try {
		if (env.CHITCHATS_ACCESS_TOKEN && env.CHITCHATS_CLIENT_ID) {
			chitChatsRates = await fetchChitChatsRates({
				country: data.country,
				postalCode: data.postalCode,
				province: data.province,
				name: 'Rate Quote',
				address1: data.street,
				city: data.city,
				weightGrams: packaging.weightGrams,
				lengthIn: packaging.lengthIn,
				widthIn: packaging.widthIn,
				heightIn: packaging.heightIn,
				valueCad: 1.00
			});
		}
	} catch (err) {
		console.error('Chit Chats rate lookup failed:', err);
	}

	const allRates = [...lettermailOptions, ...parcelRates, ...chitChatsRates];

	let zonosDuties = null;
	if (data.country === 'US' && data.items.length > 0) {
		const cheapestRate = allRates.reduce((min, r) => r.priceDetails.total < min ? r.priceDetails.total : min, Infinity);
		const cadToUsd = await getCadToUsdRate();
		const shippingCostCad = cheapestRate !== Infinity ? cheapestRate / cadToUsd : 0;

		zonosDuties = await calculateZonosDuties({
			items: data.items.map((item) => ({
				hsCode: item.hsCode || '',
				valueCadCents: item.costCents || 0,
				quantity: item.quantity || 1,
				sku: item.sku || '',
				description: item.name || 'Merchandise'
			})),
			shippingCostCad,
			destinationAddress: {
				city: data.city || '',
				state: data.province || '',
				postalCode: data.postalCode || '',
				country: data.country
			}
		});
	}

	return json({
		rates: allRates,
		packaging,
		origin: env.CP_ORIGIN_POSTAL_CODE,
		destination: {
			country: data.country,
			city: data.city,
			province: data.province,
			postalCode: data.postalCode
		},
		...(zonosDuties ? { zonosDuties } : {})
	});
};
