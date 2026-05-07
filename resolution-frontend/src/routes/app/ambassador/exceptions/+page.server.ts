import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import {
	ambassadorPathway,
	submissionClosureException,
	programEnrollment,
	programSeason,
	user,
	userPathway
} from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { PATHWAY_IDS, type PathwayId } from '$lib/pathways';

function isPathwayId(value: string): value is PathwayId {
	return (PATHWAY_IDS as readonly string[]).includes(value);
}

// Postgres unique violation
const PG_UNIQUE_VIOLATION = '23505';

export const load: PageServerLoad = async ({ parent }) => {
	const { user: currentUser } = await parent();

	const assignments = await db
		.select()
		.from(ambassadorPathway)
		.where(eq(ambassadorPathway.userId, currentUser.id));

	if (assignments.length === 0 && !currentUser.isAdmin) {
		throw error(403, 'You are not an ambassador');
	}

	// Admins can manage exceptions for any pathway, even without explicit
	// ambassador assignments.
	const assignedPathways: PathwayId[] = currentUser.isAdmin
		? ([...PATHWAY_IDS] as PathwayId[])
		: assignments.map((a) => a.pathway as PathwayId);

	const season = await db.query.programSeason.findFirst({
		where: eq(programSeason.isActive, true)
	});

	if (!season) {
		throw error(500, 'No active season configured');
	}

	const enrolledUsersBaseWhere = and(
		eq(programEnrollment.seasonId, season.id),
		eq(programEnrollment.status, 'ACTIVE')
	);

	const enrolledUsersQuery = currentUser.isAdmin
		? db
				.select({
					id: user.id,
					firstName: user.firstName,
					lastName: user.lastName,
					email: user.email
				})
				.from(programEnrollment)
				.innerJoin(user, eq(programEnrollment.userId, user.id))
				.where(enrolledUsersBaseWhere)
		: db
				.selectDistinct({
					id: user.id,
					firstName: user.firstName,
					lastName: user.lastName,
					email: user.email
				})
				.from(programEnrollment)
				.innerJoin(user, eq(programEnrollment.userId, user.id))
				.innerJoin(userPathway, eq(userPathway.userId, user.id))
				.where(
					and(
						enrolledUsersBaseWhere,
						inArray(userPathway.pathway, assignedPathways)
					)
				);

	const [enrolledUsers, exceptions] = await Promise.all([
		enrolledUsersQuery,

		db
			.select({
				id: submissionClosureException.id,
				userId: submissionClosureException.userId,
				pathway: submissionClosureException.pathway,
				weekNumber: submissionClosureException.weekNumber,
				reason: submissionClosureException.reason,
				isActive: submissionClosureException.isActive,
				expiresAt: submissionClosureException.expiresAt,
				createdAt: submissionClosureException.createdAt,
				createdBy: submissionClosureException.createdBy,
				userName: user.firstName,
				userLastName: user.lastName,
				userEmail: user.email
			})
			.from(submissionClosureException)
			.innerJoin(user, eq(submissionClosureException.userId, user.id))
			.where(
				currentUser.isAdmin
					? eq(submissionClosureException.seasonId, season.id)
					: and(
							eq(submissionClosureException.seasonId, season.id),
							inArray(submissionClosureException.pathway, assignedPathways)
						)
			)
	]);

	return {
		assignments: assignedPathways,
		season: {
			id: season.id,
			name: season.name,
			totalWeeks: season.totalWeeks
		},
		enrolledUsers,
		exceptions
	};
};

export const actions: Actions = {
	createException: async ({ request, locals }) => {
		if (!locals.user || !locals.session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		const pathway = formData.get('pathway') as string;
		const weekNumberRaw = formData.get('weekNumber') as string;
		const weekNumber = parseInt(weekNumberRaw, 10);
		const reason = formData.get('reason') as string;
		const expiresAtRaw = formData.get('expiresAt') as string;

		if (!userId || !pathway || !weekNumberRaw || Number.isNaN(weekNumber) || !reason || !expiresAtRaw) {
			return fail(400, { error: 'All fields are required' });
		}

		if (!isPathwayId(pathway)) {
			return fail(400, { error: 'Invalid pathway' });
		}

		// Validate expiresAt is a real YYYY-MM-DD date and not in the past.
		if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresAtRaw)) {
			return fail(400, { error: 'Invalid expiration date format' });
		}
		const parsedExpires = new Date(expiresAtRaw + 'T00:00:00');
		if (Number.isNaN(parsedExpires.getTime())) {
			return fail(400, { error: 'Invalid expiration date' });
		}
		const today = new Date();
		const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
		if (expiresAtRaw < todayStr) {
			return fail(400, { error: 'Expiration date must be today or in the future' });
		}

		const season = await db.query.programSeason.findFirst({
			where: eq(programSeason.isActive, true)
		});

		if (!season) {
			return fail(500, { error: 'No active season' });
		}

		if (weekNumber < 1 || weekNumber > season.totalWeeks) {
			return fail(400, { error: 'Invalid week number' });
		}

		// Verify the current ambassador is assigned to this pathway (admins bypass).
		if (!locals.user.isAdmin) {
			const assignment = await db.query.ambassadorPathway.findFirst({
				where: and(
					eq(ambassadorPathway.userId, locals.user.id),
					eq(ambassadorPathway.pathway, pathway)
				)
			});

			if (!assignment) {
				return fail(403, { error: 'You are not assigned to this pathway' });
			}
		}

		// Verify the target user is enrolled in this pathway.
		const targetEnrollment = await db.query.userPathway.findFirst({
			where: and(eq(userPathway.userId, userId), eq(userPathway.pathway, pathway))
		});

		if (!targetEnrollment) {
			return fail(400, { error: 'Selected user is not enrolled in this pathway' });
		}

		try {
			await db.insert(submissionClosureException).values({
				userId,
				seasonId: season.id,
				pathway,
				weekNumber,
				reason,
				expiresAt: expiresAtRaw,
				createdBy: locals.user.id
			});
		} catch (err) {
			const code = (err as { code?: string } | null)?.code;
			if (code === PG_UNIQUE_VIOLATION) {
				return fail(400, {
					error: 'An exception already exists for this user, pathway, and week'
				});
			}
			console.error('[exceptions] Failed to insert exception', err);
			return fail(500, { error: 'Failed to create exception' });
		}

		// Audit log: who granted this submission bypass.
		console.info(
			`[exceptions] createException by user=${locals.user.id} for target=${userId} pathway=${pathway} week=${weekNumber} expiresAt=${expiresAtRaw}`
		);

		return { success: true };
	},

	toggleException: async ({ request, locals }) => {
		if (!locals.user || !locals.session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const exceptionId = formData.get('exceptionId') as string;

		if (!exceptionId) {
			return fail(400, { error: 'Missing exception ID' });
		}

		const exception = await db.query.submissionClosureException.findFirst({
			where: eq(submissionClosureException.id, exceptionId)
		});

		if (!exception) {
			return fail(404, { error: 'Exception not found' });
		}

		if (!locals.user.isAdmin) {
			const assignment = await db.query.ambassadorPathway.findFirst({
				where: and(
					eq(ambassadorPathway.userId, locals.user.id),
					eq(ambassadorPathway.pathway, exception.pathway)
				)
			});
			if (!assignment) {
				return fail(403, { error: 'You are not assigned to this pathway' });
			}
		}

		const newState = !exception.isActive;
		await db
			.update(submissionClosureException)
			.set({ isActive: newState })
			.where(eq(submissionClosureException.id, exceptionId));

		console.info(
			`[exceptions] toggleException by user=${locals.user.id} exception=${exceptionId} isActive=${newState}`
		);

		return { success: true };
	},

	deleteException: async ({ request, locals }) => {
		if (!locals.user || !locals.session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const exceptionId = formData.get('exceptionId') as string;

		if (!exceptionId) {
			return fail(400, { error: 'Missing exception ID' });
		}

		const exception = await db.query.submissionClosureException.findFirst({
			where: eq(submissionClosureException.id, exceptionId)
		});

		if (!exception) {
			return fail(404, { error: 'Exception not found' });
		}

		if (!locals.user.isAdmin) {
			const assignment = await db.query.ambassadorPathway.findFirst({
				where: and(
					eq(ambassadorPathway.userId, locals.user.id),
					eq(ambassadorPathway.pathway, exception.pathway)
				)
			});
			if (!assignment) {
				return fail(403, { error: 'You are not assigned to this pathway' });
			}
		}

		await db.delete(submissionClosureException).where(eq(submissionClosureException.id, exceptionId));

		console.info(
			`[exceptions] deleteException by user=${locals.user.id} exception=${exceptionId}`
		);

		return { success: true };
	}
};
