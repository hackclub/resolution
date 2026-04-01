import { env } from '$env/dynamic/private';
import Airtable from 'airtable';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard';

export const GET: RequestHandler = async (event) => {
	const { user } = requireAuth(event);

	if (!env.AIRTABLE_API_TOKEN || !env.AIRTABLE_BASE_ID || !env.AIRTABLE_YSWS_TABLE_ID) {
		console.error('Missing Airtable YSWS configuration');
		return json({ error: 'Server configuration error' }, { status: 500 });
	}

	try {
		const base = new Airtable({ apiKey: env.AIRTABLE_API_TOKEN }).base(env.AIRTABLE_BASE_ID);

		const filterByFormula = `{Email} = "${user.email}"`;

		const records = await base(env.AIRTABLE_YSWS_TABLE_ID)
			.select({
				filterByFormula,
				fields: [
					'Code URL',
					'Playable URL',
					'Description',
					'First Name',
					'Last Name',
					'Email',
					'Pathway',
					'Week',
					'Screenshot',
					'Rejected',
					'Reject Reason',
					'Automation - Status'
				]
			})
			.all();

		const submissions = records.map((record) => {
			const rejected = record.get('Rejected') as boolean | undefined;
			const automationStatus = record.get('Automation - Status') as string | undefined;

			let status: 'rejected' | 'accepted' | 'pending';
			if (rejected) {
				status = 'rejected';
			} else if (automationStatus === '2-Submitted') {
				status = 'accepted';
			} else {
				status = 'pending';
			}

			return {
				id: record.id,
				codeUrl: record.get('Code URL') as string,
				playableUrl: record.get('Playable URL') as string,
				description: record.get('Description') as string,
				firstName: record.get('First Name') as string,
				lastName: record.get('Last Name') as string,
				pathway: record.get('Pathway') as string,
				week: record.get('Week') as number,
				screenshotUrl: (record.get('Screenshot') as Array<{ url: string }> | undefined)?.[0]?.url ?? null,
				rejected: rejected ?? false,
				rejectReason: (record.get('Reject Reason') as string) ?? null,
				automationStatus: automationStatus ?? null,
				status,
				submittedAt: record._rawJson.createdTime as string
			};
		});

		return json(submissions);
	} catch (err) {
		console.error('Fetch user submissions error:', err);
		return json({ error: 'Failed to fetch your submissions' }, { status: 500 });
	}
};
