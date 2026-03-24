import { env } from '$env/dynamic/private';

const HCB_BASE_URL = 'https://hcb.hackclub.com/api/v4';
const HCB_TOKEN_URL = 'https://hcb.hackclub.com/api/v4/oauth/token';
const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

const RESOLUTION_ORG_ID = 'org_0zuxO2';

const PATHWAY_ORG_MAP: Record<string, string> = {
	PYTHON: 'org_lbu4GE',
	GENERAL_CODING: 'org_5GuRj1',
	GAME_DEV: 'org_NOuVO8',
	DESIGN: 'org_Q4uqwO',
	RUST: 'org_G3uEbg',
	HARDWARE: 'org_0zuxZA'
};

let cachedAccessToken: string | null = null;
let cachedRefreshToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
	if (cachedAccessToken && Date.now() < tokenExpiresAt) {
		return cachedAccessToken;
	}

	const clientId = env.HCB_CLIENT_ID;
	const clientSecret = env.HCB_CLIENT_SECRET;
	const refreshToken = cachedRefreshToken || env.HCB_REFRESH_TOKEN;
	if (!clientId || !clientSecret || !refreshToken) {
		throw new Error('HCB not configured: HCB_CLIENT_ID, HCB_CLIENT_SECRET, and HCB_REFRESH_TOKEN required');
	}

	// Use initial access token on first call if not yet refreshed
	if (!cachedAccessToken && env.HCB_ACCESS_TOKEN) {
		cachedAccessToken = env.HCB_ACCESS_TOKEN;
		cachedRefreshToken = refreshToken;
		tokenExpiresAt = Date.now() + REFRESH_INTERVAL_MS;
		return cachedAccessToken;
	}

	const res = await fetch(HCB_TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
			client_id: clientId,
			client_secret: clientSecret
		})
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`HCB token refresh failed (${res.status}): ${body}`);
	}

	const data = await res.json();
	cachedAccessToken = data.access_token;
	cachedRefreshToken = data.refresh_token;
	tokenExpiresAt = Date.now() + REFRESH_INTERVAL_MS;

	return cachedAccessToken!;
}

export async function createHcbTransfer(
	fromOrgId: string,
	amountCents: number,
	memo: string
): Promise<{ id: string; amount_cents: number; name: string }> {
	const accessToken = await getAccessToken();

	const res = await fetch(`${HCB_BASE_URL}/organizations/${fromOrgId}/transfers`, {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${accessToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			to_organization_id: RESOLUTION_ORG_ID,
			amount_cents: amountCents,
			name: memo
		})
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`HCB transfer failed (${res.status}): ${body}`);
	}

	return res.json();
}

export function getOrgIdForPathway(pathway: string): string | null {
	return PATHWAY_ORG_MAP[pathway] ?? null;
}
