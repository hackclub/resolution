import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { requireAuth } from '$lib/server/auth/guard';
import { validateJson, shippingRateSchema } from '$lib/server/validation';
import { db } from '$lib/server/db';
import { ambassadorPathway } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { GRAMS_TO_KG, inchesToCm, fetchRates, getLetterMailOptions } from '$lib/server/canada-post';

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

	const weightKg = data.weight * GRAMS_TO_KG;

	// For flats/envelopes, snap to available envelope sizes (4x6in or 6x9in).
	// If too large for 6x9, treat as a bubble packet with 0.5in thickness.
	let effectiveLength = data.length;
	let effectiveWidth = data.width;
	let effectivePackageType = data.packageType;
	if (data.packageType === 'flat' || data.packageType === 'envelope') {
		const l = Math.max(data.length, data.width);
		const w = Math.min(data.length, data.width);
		if (l <= 6 && w <= 4) {
			effectiveLength = 6;
			effectiveWidth = 4;
		} else if (l <= 9 && w <= 6) {
			effectiveLength = 9;
			effectiveWidth = 6;
		} else {
			// Too large for available envelopes — treat as bubble packet
			effectiveLength = l;
			effectiveWidth = w;
			effectivePackageType = 'box';
		}
	}

	const lengthCm = inchesToCm(effectiveLength);
	const widthCm = inchesToCm(effectiveWidth);
	const heightCm = effectivePackageType === 'box'
		? inchesToCm(data.packageType === 'box' ? data.height : 0.5)
		: 0.5;

	const lettermailOptions = getLetterMailOptions(data.weight, lengthCm, widthCm, heightCm, data.country);

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

	const allRates = [...lettermailOptions, ...parcelRates];

	return json({
		rates: allRates,
		origin: env.CP_ORIGIN_POSTAL_CODE,
		destination: {
			country: data.country,
			city: data.city,
			province: data.province,
			postalCode: data.postalCode
		}
	});
};
