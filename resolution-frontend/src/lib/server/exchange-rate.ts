import { env } from '$env/dynamic/private';

const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

let cachedRate: number | null = null;
let cachedAt = 0;

const FALLBACK_CAD_TO_USD = 0.73;

/**
 * Returns the current CAD to USD exchange rate.
 * Fetches from an external API and caches for 1 hour.
 * Falls back to a static rate if the API is unavailable.
 */
export async function getCadToUsdRate(): Promise<number> {
	if (cachedRate && Date.now() - cachedAt < CACHE_DURATION_MS) {
		return cachedRate;
	}

	try {
		const res = await fetch('https://open.er-api.com/v6/latest/CAD', {
			signal: AbortSignal.timeout(5000)
		});

		if (res.ok) {
			const data = await res.json();
			const rate = data?.rates?.USD;
			if (typeof rate === 'number' && rate > 0) {
				const rounded = Math.round(rate * 10000) / 10000;
				cachedRate = rounded;
				cachedAt = Date.now();
				return rounded;
			}
		}
	} catch (err) {
		console.error('Exchange rate fetch failed, using fallback:', err);
	}

	// Use env override or fallback
	const envRate = env.CAD_TO_USD_RATE ? parseFloat(env.CAD_TO_USD_RATE) : null;
	if (envRate && envRate > 0) return envRate;

	return FALLBACK_CAD_TO_USD;
}
