import { env } from '$env/dynamic/private';
import Airtable from 'airtable';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard';
import { db } from '$lib/server/db';
import { reviewerPathway } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { PATHWAY_IDS } from '$lib/pathways';

export const GET: RequestHandler = async (event) => {
	const { user } = requireAuth(event);

	if (!env.AIRTABLE_API_TOKEN || !env.AIRTABLE_BASE_ID || !env.AIRTABLE_YSWS_TABLE_ID) {
		console.error('Missing Airtable YSWS configuration');
		return json({ error: 'Server configuration error' }, { status: 500 });
	}

	try {
		const assignments = await db
			.select()
			.from(reviewerPathway)
			.where(eq(reviewerPathway.userId, user.id));

		const assignedPathways = assignments.map((a) => a.pathway);

		if (assignedPathways.length === 0 && !user.isAdmin) {
			return json({ error: 'You do not have reviewer access to any pathways' }, { status: 403 });
		}

		const pathwayParam = event.url.searchParams.get('pathway');
		let pathwaysToQuery: string[];

		if (pathwayParam) {
			if (!PATHWAY_IDS.includes(pathwayParam as typeof PATHWAY_IDS[number])) {
				return json({ error: 'Invalid pathway' }, { status: 400 });
			}
			if (!user.isAdmin && !assignedPathways.includes(pathwayParam as typeof assignedPathways[number])) {
				return json({ error: 'You do not have reviewer access to this pathway' }, { status: 403 });
			}
			pathwaysToQuery = [pathwayParam];
		} else if (user.isAdmin) {
			pathwaysToQuery = [];
		} else {
			pathwaysToQuery = assignedPathways;
		}

		const pathwayConditions = pathwaysToQuery.map((p) => `{Pathway} = "${p}"`).join(', ');
		const pathwayFilter = pathwaysToQuery.length > 0 ? `, OR(${pathwayConditions})` : '';
		const filterByFormula = `AND({Automation - Status} = "1–Pending Submission", NOT({Rejected})${pathwayFilter})`;

		const base = new Airtable({ apiKey: env.AIRTABLE_API_TOKEN }).base(env.AIRTABLE_BASE_ID);

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
					'GitHub Username',
					'Hackatime Project',
					'Pathway',
					'Week',
					'Screenshot',
					'Optional - Override Hours Spent'
				]
			})
			.all();

		const submissions = records.map((record) => ({
			id: record.id,
			codeUrl: record.get('Code URL') as string,
			playableUrl: record.get('Playable URL') as string,
			description: record.get('Description') as string,
			firstName: record.get('First Name') as string,
			lastName: record.get('Last Name') as string,
			email: record.get('Email') as string,
			githubUsername: record.get('GitHub Username') as string,
			hackatimeProject: record.get('Hackatime Project') as string,
			pathway: record.get('Pathway') as string,
			week: record.get('Week') as number,
			screenshotUrl: (record.get('Screenshot') as Array<{ url: string }> | undefined)?.[0]?.url ?? null,
			hoursSpent: (record.get('Optional - Override Hours Spent') as number | undefined) ?? null,
			submittedAt: record._rawJson.createdTime as string
		}));

		return json(submissions);
	} catch (err) {
		console.error('Fetch submissions error:', err);
		return json({ error: 'Failed to fetch submissions' }, { status: 500 });
	}
};
