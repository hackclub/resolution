import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { ambassadorPathway, submissionClosureException, programEnrollment, programSeason, user } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { PATHWAY_IDS } from '$lib/pathways';

export const load: PageServerLoad = async ({ parent }) => {
	const { user: currentUser } = await parent();

	const assignments = await db
		.select()
		.from(ambassadorPathway)
		.where(eq(ambassadorPathway.userId, currentUser.id));

	if (assignments.length === 0 && !currentUser.isAdmin) {
		throw error(403, 'You are not an ambassador');
	}

	const assignedPathways = assignments.map((a) => a.pathway);

	const season = await db.query.programSeason.findFirst({
		where: eq(programSeason.isActive, true)
	});

	if (!season) {
		throw error(500, 'No active season configured');
	}

	const [enrolledUsers, exceptions] = await Promise.all([
		db
			.select({
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email
			})
			.from(programEnrollment)
			.innerJoin(user, eq(programEnrollment.userId, user.id))
			.where(
				and(
					eq(programEnrollment.seasonId, season.id),
					eq(programEnrollment.status, 'ACTIVE')
				)
			),

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
				userName: user.firstName,
				userLastName: user.lastName,
				userEmail: user.email
			})
			.from(submissionClosureException)
			.innerJoin(user, eq(submissionClosureException.userId, user.id))
			.where(eq(submissionClosureException.seasonId, season.id))
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
		const weekNumber = parseInt(formData.get('weekNumber') as string, 10);
		const reason = formData.get('reason') as string;
		const expiresAt = formData.get('expiresAt') as string;

		if (!userId || !pathway || !weekNumber || !reason || !expiresAt) {
			return fail(400, { error: 'All fields are required' });
		}

		if (!PATHWAY_IDS.includes(pathway)) {
			return fail(400, { error: 'Invalid pathway' });
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

		const assignment = await db.query.ambassadorPathway.findFirst({
			where: and(
				eq(ambassadorPathway.userId, locals.user.id),
				eq(ambassadorPathway.pathway, pathway as any)
			)
		});

		if (!assignment && !locals.user.isAdmin) {
			return fail(403, { error: 'You are not assigned to this pathway' });
		}

		try {
			await db.insert(submissionClosureException).values({
				userId,
				seasonId: season.id,
				pathway: pathway as any,
				weekNumber,
				reason,
				expiresAt: new Date(expiresAt),
				createdBy: locals.user.id
			});
		} catch {
			return fail(400, { error: 'An exception already exists for this user, pathway, and week' });
		}

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

		await db
			.update(submissionClosureException)
			.set({ isActive: !exception.isActive })
			.where(eq(submissionClosureException.id, exceptionId));

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

		await db.delete(submissionClosureException).where(eq(submissionClosureException.id, exceptionId));

		return { success: true };
	}
};
