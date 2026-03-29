import { env } from '$env/dynamic/private';
import Airtable from 'airtable';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard';
import { db } from '$lib/server/db';
import { ambassadorPathway } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const DROPOFF_BASE_ID = 'appBNiSU5dhKUDwMq';
const DROPOFF_TABLE_ID = 'tbljEanB1Q0Rup8go';
const FIELD_EMAIL = 'fldZXPMbMtKP0EwRW';
const FIELD_WEEK = 'fldFDNFjl12NpCCJT';
const FIELD_PATHWAY = 'fldKcikYfiJIQzEwT';
const FIELD_REJECTED = 'fldWImB6tXMwhXcKn';

const PATHWAYS = ['RUST', 'GENERAL_CODING', 'PYTHON', 'HARDWARE', 'GAME_DEV', 'DESIGN'] as const;

export const GET: RequestHandler = async (event) => {
	const { user } = requireAuth(event);

	// Only ambassadors and admins can view this data
	if (!user.isAdmin) {
		const assignments = await db
			.select()
			.from(ambassadorPathway)
			.where(eq(ambassadorPathway.userId, user.id));

		if (assignments.length === 0) {
			return json({ error: 'Access denied' }, { status: 403 });
		}
	}

	if (!env.AIRTABLE_API_TOKEN) {
		return json({ error: 'Airtable not configured' }, { status: 500 });
	}

	try {
		const base = new Airtable({ apiKey: env.AIRTABLE_API_TOKEN }).base(DROPOFF_BASE_ID);

		const records: { email: string; week: number; pathway: string }[] = [];

		await new Promise<void>((resolve, reject) => {
			base(DROPOFF_TABLE_ID)
				.select({
					fields: [FIELD_EMAIL, FIELD_WEEK, FIELD_PATHWAY, FIELD_REJECTED]
				})
				.eachPage(
					(pageRecords, fetchNextPage) => {
						for (const record of pageRecords) {
							const rejected = record.get(FIELD_REJECTED);
							if (rejected === true) continue;

							const email = record.get(FIELD_EMAIL) as string;
							const week = record.get(FIELD_WEEK) as number;
							const pathway = record.get(FIELD_PATHWAY) as string;

							if (email && week && pathway) {
								records.push({ email, week, pathway });
							}
						}
						fetchNextPage();
					},
					(err) => {
						if (err) reject(err);
						else resolve();
					}
				);
		});

		// Unique participants per week (by email)
		const week1Emails = new Set<string>();
		const week2Emails = new Set<string>();
		const week1ByPathway: Record<string, Set<string>> = {};
		const week2ByPathway: Record<string, Set<string>> = {};

		for (const pw of PATHWAYS) {
			week1ByPathway[pw] = new Set();
			week2ByPathway[pw] = new Set();
		}

		for (const r of records) {
			if (r.week === 1) {
				week1Emails.add(r.email);
				if (r.pathway in week1ByPathway) {
					week1ByPathway[r.pathway].add(r.email);
				}
			} else if (r.week === 2) {
				week2Emails.add(r.email);
				if (r.pathway in week2ByPathway) {
					week2ByPathway[r.pathway].add(r.email);
				}
			}
		}

		const returned = new Set([...week2Emails].filter((e) => week1Emails.has(e)));
		const droppedOff = new Set([...week1Emails].filter((e) => !week2Emails.has(e)));
		const newInWeek2 = new Set([...week2Emails].filter((e) => !week1Emails.has(e)));

		const dropoffPct = week1Emails.size > 0
			? Math.round((droppedOff.size / week1Emails.size) * 100)
			: 0;

		const pathwayBreakdown = PATHWAYS.map((pw) => {
			const w1 = week1ByPathway[pw];
			const w2 = week2ByPathway[pw];
			const pwReturned = new Set([...w2].filter((e) => w1.has(e)));
			const pwDropped = new Set([...w1].filter((e) => !w2.has(e)));
			const pwNew = new Set([...w2].filter((e) => !w1.has(e)));
			const pwDropoffPct = w1.size > 0 ? Math.round((pwDropped.size / w1.size) * 100) : 0;

			return {
				pathway: pw,
				week1: w1.size,
				week2: w2.size,
				returned: pwReturned.size,
				droppedOff: pwDropped.size,
				newInWeek2: pwNew.size,
				dropoffPct: pwDropoffPct
			};
		});

		return json({
			week1: week1Emails.size,
			week2: week2Emails.size,
			returned: returned.size,
			droppedOff: droppedOff.size,
			newInWeek2: newInWeek2.size,
			dropoffPct,
			pathwayBreakdown
		});
	} catch (err) {
		console.error('Drop-off analytics error:', err);
		return json({ error: 'Failed to fetch analytics' }, { status: 500 });
	}
};
