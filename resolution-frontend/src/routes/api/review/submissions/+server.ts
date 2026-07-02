import { env } from '$env/dynamic/private';
import Airtable from 'airtable';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard';
import { db } from '$lib/server/db';
import { reviewerPathway, ambassadorPathway, user as userTable } from '$lib/server/db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
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

		const ambassadorRows = await db
			.select({ userId: ambassadorPathway.userId })
			.from(ambassadorPathway)
			.where(eq(ambassadorPathway.userId, user.id))
			.limit(1);
		const isAmbassador = ambassadorRows.length > 0;

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

		const statusParam = event.url.searchParams.get('status') ?? 'pending';
		const validStatuses = ['pending', 'approved', 'rejected', 'all'];
		if (!validStatuses.includes(statusParam)) {
			return json({ error: 'Invalid status' }, { status: 400 });
		}

		let statusCondition: string | null;
		switch (statusParam) {
			case 'approved':
				statusCondition = `AND({Automation - Submit to Unified YSWS} = TRUE(), NOT({Rejected}))`;
				break;
			case 'rejected':
				statusCondition = `{Rejected} = TRUE()`;
				break;
			case 'all':
				statusCondition = null;
				break;
			case 'pending':
			default:
				statusCondition = `AND({Automation - Status} = "1–Pending Submission", NOT({Rejected}))`;
				break;
		}

		const pathwayConditions = pathwaysToQuery.map((p) => `{Pathway} = "${p}"`).join(', ');
		const pathwayCondition = pathwaysToQuery.length > 0 ? `OR(${pathwayConditions})` : null;

		const conditions = [statusCondition, pathwayCondition].filter((c): c is string => c !== null);
		const filterByFormula = conditions.length > 0 ? `AND(${conditions.join(', ')})` : '';

		const base = new Airtable({ apiKey: env.AIRTABLE_API_TOKEN }).base(env.AIRTABLE_BASE_ID);

		const addressFields = [
			'Address (Line 1)',
			'Address (Line 2)',
			'City',
			'State / Province',
			'Country',
			'ZIP / Postal Code'
		];

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
					'Optional - Override Hours Spent',
					'Rejected',
					'Automation - Submit to Unified YSWS',
					...(isAmbassador ? addressFields : [])
				]
			})
			.all();

		const emails = Array.from(
			new Set(
				records
					.map((r) => r.get('Email') as string | undefined)
					.filter((e): e is string => typeof e === 'string' && e.length > 0)
					.map((e) => e.toLowerCase())
			)
		);

		const slackIdByEmail = new Map<string, string | null>();
		if (emails.length > 0) {
			const users = await db
				.select({ email: userTable.email, slackId: userTable.slackId })
				.from(userTable)
				.where(inArray(sql`lower(${userTable.email})`, emails));
			for (const u of users) {
				slackIdByEmail.set(u.email.toLowerCase(), u.slackId);
			}
		}

		const submissions = records.map((record) => {
			const email = record.get('Email') as string;
			const rejected = record.get('Rejected') === true;
			const approved = record.get('Automation - Submit to Unified YSWS') === true;
			const status = rejected ? 'rejected' : approved ? 'approved' : 'pending';
			return {
				id: record.id,
				codeUrl: record.get('Code URL') as string,
				playableUrl: record.get('Playable URL') as string,
				description: record.get('Description') as string,
				firstName: record.get('First Name') as string,
				lastName: record.get('Last Name') as string,
				email,
				slackId: slackIdByEmail.get(email?.toLowerCase()) ?? null,
				githubUsername: record.get('GitHub Username') as string,
				hackatimeProject: record.get('Hackatime Project') as string,
				pathway: record.get('Pathway') as string,
				week: record.get('Week') as number,
				screenshotUrl: (record.get('Screenshot') as Array<{ url: string }> | undefined)?.[0]?.url ?? null,
				hoursSpent: (record.get('Optional - Override Hours Spent') as number | undefined) ?? null,
				submittedAt: record._rawJson.createdTime as string,
				status,
				...(isAmbassador
					? {
							address: {
								line1: (record.get('Address (Line 1)') as string | undefined) ?? null,
								line2: (record.get('Address (Line 2)') as string | undefined) ?? null,
								city: (record.get('City') as string | undefined) ?? null,
								stateProvince: (record.get('State / Province') as string | undefined) ?? null,
								country: (record.get('Country') as string | undefined) ?? null,
								zipPostalCode: (record.get('ZIP / Postal Code') as string | undefined) ?? null
							}
						}
					: {})
			};
		});

		return json(submissions);
	} catch (err) {
		console.error('Fetch submissions error:', err);
		return json({ error: 'Failed to fetch submissions' }, { status: 500 });
	}
};
