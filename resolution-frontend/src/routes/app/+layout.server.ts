import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { programSeason, programEnrollment } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { timed } from '$lib/server/timing';

const ACTIVE_SEASON_CACHE_MS = 60_000;
let activeSeasonCache: typeof programSeason.$inferSelect | null = null;
let activeSeasonCacheExpiresAt = 0;

async function getCachedActiveSeason() {
	if (Date.now() < activeSeasonCacheExpiresAt) {
		return activeSeasonCache;
	}

	activeSeasonCache = await db.query.programSeason.findFirst({
		where: eq(programSeason.isActive, true)
	}) ?? null;
	activeSeasonCacheExpiresAt = Date.now() + ACTIVE_SEASON_CACHE_MS;
	return activeSeasonCache;
}

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user || !locals.session) {
		throw redirect(302, '/api/auth/login');
	}

	const activeSeason = await timed(locals, 'season', getCachedActiveSeason, 'active season (cached)');

	const enrollment = activeSeason
		? await timed(
				locals,
				'enrollment',
				() =>
					db.query.programEnrollment.findFirst({
						where: and(
							eq(programEnrollment.userId, locals.user!.id),
							eq(programEnrollment.seasonId, activeSeason.id),
							eq(programEnrollment.status, 'ACTIVE')
						)
					}),
				'enrollment lookup'
			)
		: null;

	return {
		user: locals.user,
		season: activeSeason,
		enrollment
	};
};
