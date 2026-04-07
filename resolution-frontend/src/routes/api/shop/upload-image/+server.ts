import { env } from '$env/dynamic/private';
import Airtable, { type FieldSet } from 'airtable';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard';
import { db } from '$lib/server/db';
import { ambassadorPathway } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { PATHWAY_IDS, type PathwayId } from '$lib/pathways';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

/**
 * Upload a shop image (item photo or currency icon) and return its hosted URL.
 * Storage: Airtable attachment in a dedicated `ShopAssets` table.
 *
 * Required env: AIRTABLE_API_TOKEN, AIRTABLE_BASE_ID, AIRTABLE_SHOP_ASSETS_TABLE_ID
 * The Airtable table must contain at least: `Pathway` (text), `Kind` (text),
 * `Image` (attachment).
 */
export const POST: RequestHandler = async (event) => {
	const { user } = requireAuth(event);

	if (!env.AIRTABLE_API_TOKEN || !env.AIRTABLE_BASE_ID || !env.AIRTABLE_SHOP_ASSETS_TABLE_ID) {
		return json({ error: 'Shop image upload not configured' }, { status: 500 });
	}

	const formData = await event.request.formData();
	const file = formData.get('file') as File | null;
	const pathwayRaw = formData.get('pathway') as string | null;
	const kind = (formData.get('kind') as string | null) ?? 'item';

	if (!file || file.size === 0) return json({ error: 'File is required' }, { status: 400 });
	if (file.size > MAX_FILE_SIZE) return json({ error: 'Max 5MB' }, { status: 400 });
	if (!ALLOWED.includes(file.type)) return json({ error: 'PNG/JPEG/GIF/WebP only' }, { status: 400 });
	if (!pathwayRaw || !PATHWAY_IDS.includes(pathwayRaw.toUpperCase() as PathwayId)) {
		return json({ error: 'Invalid pathway' }, { status: 400 });
	}
	const pathway = pathwayRaw.toUpperCase() as PathwayId;

	// Authorise: must be admin or assigned ambassador for this pathway.
	if (!user.isAdmin) {
		const assignment = await db
			.select({ id: ambassadorPathway.id })
			.from(ambassadorPathway)
			.where(and(eq(ambassadorPathway.userId, user.id), eq(ambassadorPathway.pathway, pathway)))
			.limit(1);
		if (assignment.length === 0) {
			return json({ error: 'Not assigned to this pathway' }, { status: 403 });
		}
	}

	try {
		const base = new Airtable({ apiKey: env.AIRTABLE_API_TOKEN }).base(env.AIRTABLE_BASE_ID);
		const fields: FieldSet = { Pathway: pathway, Kind: kind };
		const records = await base(env.AIRTABLE_SHOP_ASSETS_TABLE_ID).create([{ fields }]);
		const recordId = records[0].getId();

		const arrayBuffer = await file.arrayBuffer();
		const base64 = Buffer.from(arrayBuffer).toString('base64');

		const uploadResp = await fetch(
			`https://content.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${recordId}/Image/uploadAttachment`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${env.AIRTABLE_API_TOKEN}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ contentType: file.type, file: base64, filename: file.name })
			}
		);
		if (!uploadResp.ok) {
			const text = await uploadResp.text();
			console.error('Airtable shop image upload failed:', text);
			return json({ error: 'Upload failed' }, { status: 502 });
		}

		// Read back the attachment URL.
		const fetched = await base(env.AIRTABLE_SHOP_ASSETS_TABLE_ID).find(recordId);
		const attachments = fetched.get('Image') as Array<{ url: string }> | undefined;
		const url = attachments?.[0]?.url;
		if (!url) return json({ error: 'Upload succeeded but no URL returned' }, { status: 502 });

		return json({ url });
	} catch (err) {
		console.error('Shop image upload error:', err);
		return json({ error: 'Upload failed' }, { status: 500 });
	}
};
