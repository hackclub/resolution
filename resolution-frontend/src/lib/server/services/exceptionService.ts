import { db } from '../db';
import { submissionClosureException, programSeason } from '../db/schema';
import { eq, and, gt } from 'drizzle-orm';
import type { PathwayId } from '$lib/pathways';

export const ExceptionService = {
	/**
	 * Check if a user has an active, non-expired exception for a given pathway and week.
	 * Returns the exception record if found, null otherwise.
	 */
	async getActiveException(
		userId: string,
		pathway: PathwayId,
		weekNumber: number
	) {
		const season = await db.query.programSeason.findFirst({
			where: eq(programSeason.isActive, true)
		});

		if (!season) return null;

		const [exception] = await db
			.select({
				id: submissionClosureException.id,
				expiresAt: submissionClosureException.expiresAt
			})
			.from(submissionClosureException)
			.where(
				and(
					eq(submissionClosureException.userId, userId),
					eq(submissionClosureException.seasonId, season.id),
					eq(submissionClosureException.pathway, pathway),
					eq(submissionClosureException.weekNumber, weekNumber),
					eq(submissionClosureException.isActive, true),
					gt(submissionClosureException.expiresAt, new Date())
				)
			)
			.limit(1);

		return exception || null;
	}
};
