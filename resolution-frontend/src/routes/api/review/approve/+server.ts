import { env } from '$env/dynamic/private';
import Airtable from 'airtable';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard';
import { db } from '$lib/server/db';
import { reviewerPathway } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async (event) => {
	const { user } = requireAuth(event);

	if (!env.AIRTABLE_API_TOKEN || !env.AIRTABLE_BASE_ID || !env.AIRTABLE_YSWS_TABLE_ID) {
		console.error('Missing Airtable YSWS configuration');
		return json({ error: 'Server configuration error' }, { status: 500 });
	}

	try {
		const body = await event.request.json();
		const { recordId, hours, justification } = body as {
			recordId: string;
			hours: number;
			justification: string;
		};

		if (!recordId || typeof recordId !== 'string') {
			return json({ error: 'recordId is required' }, { status: 400 });
		}

		if (typeof hours !== 'number' || hours <= 0) {
			return json({ error: 'hours must be a positive number' }, { status: 400 });
		}

		if (!justification || typeof justification !== 'string' || justification.trim().length === 0) {
			return json({ error: 'justification is required' }, { status: 400 });
		}

		const base = new Airtable({ apiKey: env.AIRTABLE_API_TOKEN }).base(env.AIRTABLE_BASE_ID);

		const record = await base(env.AIRTABLE_YSWS_TABLE_ID).find(recordId);
		const pathway = record.get('Pathway') as string;

		if (!user.isAdmin) {
			const assignments = await db
				.select()
				.from(reviewerPathway)
				.where(eq(reviewerPathway.userId, user.id));

			const assignedPathways = assignments.map((a) => a.pathway);

			if (!assignedPathways.includes(pathway as typeof assignedPathways[number])) {
				return json({ error: 'You do not have reviewer access to this pathway' }, { status: 403 });
			}
		}

		await base(env.AIRTABLE_YSWS_TABLE_ID).update(recordId, {
			'Optional - Override Hours Spent': hours,
			'Optional - Override Hours Spent Justification': justification.trim(),
			'Automation - Submit to Unified YSWS': true
		});

		return json({ success: true });
	} catch (err) {
		if (err instanceof SyntaxError) {
			return json({ error: 'Invalid request body' }, { status: 400 });
		}

		console.error('Approve submission error:', err);
		return json({ error: 'Failed to approve submission' }, { status: 500 });
	}
};
