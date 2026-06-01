import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard';
import { db } from '$lib/server/db';
import {
	ambassadorPathway,
	programEnrollment,
	programSeason,
	user,
	userPathway
} from '$lib/server/db/schema';
import { and, eq, ilike, inArray, or } from 'drizzle-orm';
import { PATHWAY_IDS, type PathwayId } from '$lib/pathways';

const MAX_RESULTS = 20;
const MIN_QUERY_LENGTH = 2;

export const GET: RequestHandler = async (event) => {
	const { user: currentUser } = requireAuth(event);

	const q = event.url.searchParams.get('q')?.trim() ?? '';
	if (q.length < MIN_QUERY_LENGTH) {
		return json({ users: [] });
	}

	const assignments = await db
		.select()
		.from(ambassadorPathway)
		.where(eq(ambassadorPathway.userId, currentUser.id));

	if (assignments.length === 0 && !currentUser.isAdmin) {
		return json({ error: 'You are not an ambassador' }, { status: 403 });
	}

	const assignedPathways: PathwayId[] = currentUser.isAdmin
		? ([...PATHWAY_IDS] as PathwayId[])
		: assignments.map((a) => a.pathway as PathwayId);

	const season = await db.query.programSeason.findFirst({
		where: eq(programSeason.isActive, true)
	});

	if (!season) {
		return json({ error: 'No active season' }, { status: 500 });
	}

	const pattern = `%${q.replace(/[\\%_]/g, (m) => '\\' + m)}%`;
	const matchesQuery = or(
		ilike(user.firstName, pattern),
		ilike(user.lastName, pattern),
		ilike(user.email, pattern)
	);

	const baseWhere = and(
		eq(programEnrollment.seasonId, season.id),
		eq(programEnrollment.status, 'ACTIVE'),
		matchesQuery
	);

	const results = currentUser.isAdmin
		? await db
				.select({
					id: user.id,
					firstName: user.firstName,
					lastName: user.lastName,
					email: user.email
				})
				.from(programEnrollment)
				.innerJoin(user, eq(programEnrollment.userId, user.id))
				.where(baseWhere)
				.limit(MAX_RESULTS)
		: await db
				.selectDistinct({
					id: user.id,
					firstName: user.firstName,
					lastName: user.lastName,
					email: user.email
				})
				.from(programEnrollment)
				.innerJoin(user, eq(programEnrollment.userId, user.id))
				.innerJoin(userPathway, eq(userPathway.userId, user.id))
				.where(and(baseWhere, inArray(userPathway.pathway, assignedPathways)))
				.limit(MAX_RESULTS);

	return json({ users: results });
};
