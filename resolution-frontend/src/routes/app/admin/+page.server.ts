import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { user, programEnrollment, workshopCompletion, weeklyShip, programSeason, ambassadorPathway, reviewerPathway } from '$lib/server/db/schema';
import { eq, count, sql, desc } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { PATHWAY_IDS, type PathwayId } from '$lib/pathways';

const validPathways = PATHWAY_IDS;
type Pathway = PathwayId;

export const load: PageServerLoad = async ({ parent }) => {
	const { user: currentUser } = await parent();

	if (!currentUser.isAdmin) {
		throw error(403, 'Access denied');
	}

	const [users, analytics, ambassadorAssignments, reviewerAssignments] = await Promise.all([
		db
			.select({
				id: user.id,
				email: user.email,
				firstName: user.firstName,
				lastName: user.lastName,
				slackId: user.slackId,
				isAdmin: user.isAdmin,
				yswsEligible: user.yswsEligible,
				createdAt: user.createdAt
			})
			.from(user)
			.orderBy(desc(user.createdAt)),

		Promise.all([
			db.select({ count: count() }).from(user),
			db.select({ count: count() }).from(programEnrollment).where(eq(programEnrollment.status, 'ACTIVE')),
			db.select({ count: count() }).from(workshopCompletion).where(sql`${workshopCompletion.completedAt} IS NOT NULL`),
			db.select({ count: count() }).from(weeklyShip).where(eq(weeklyShip.status, 'SHIPPED'))
		]),

		db.select().from(ambassadorPathway),

		db.select().from(reviewerPathway)
	]);

	const ambassadorsByUser = ambassadorAssignments.reduce((acc, a) => {
		if (!acc[a.userId]) acc[a.userId] = [];
		acc[a.userId].push(a.pathway);
		return acc;
	}, {} as Record<string, Pathway[]>);

	const reviewersByUser = reviewerAssignments.reduce((acc, a) => {
		if (!acc[a.userId]) acc[a.userId] = [];
		acc[a.userId].push(a.pathway);
		return acc;
	}, {} as Record<string, Pathway[]>);

	return {
		users,
		analytics: {
			totalUsers: analytics[0][0].count,
			activeEnrollments: analytics[1][0].count,
			completedWorkshops: analytics[2][0].count,
			shippedProjects: analytics[3][0].count
		},
		ambassadorsByUser,
		reviewersByUser,
		pathways: validPathways
	};
};

export const actions: Actions = {
	toggleAdmin: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) {
			return fail(403, { error: 'Access denied' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId') as string;

		if (!userId) {
			return fail(400, { error: 'User ID required' });
		}

		if (userId === locals.user.id) {
			return fail(400, { error: 'Cannot modify your own admin status' });
		}

		const targetUser = await db.query.user.findFirst({
			where: eq(user.id, userId)
		});

		if (!targetUser) {
			return fail(404, { error: 'User not found' });
		}

		await db
			.update(user)
			.set({ isAdmin: !targetUser.isAdmin })
			.where(eq(user.id, userId));

		return { success: true };
	},

	deleteUser: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) {
			return fail(403, { error: 'Access denied' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId') as string;

		if (!userId) {
			return fail(400, { error: 'User ID required' });
		}

		if (userId === locals.user.id) {
			return fail(400, { error: 'Cannot delete yourself' });
		}

		await db.delete(user).where(eq(user.id, userId));

		return { success: true };
	},

	assignAmbassador: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) {
			return fail(403, { error: 'Access denied' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		const pathway = formData.get('pathway') as Pathway;

		if (!userId || !pathway) {
			return fail(400, { error: 'User ID and pathway required' });
		}

		if (!validPathways.includes(pathway)) {
			return fail(400, { error: 'Invalid pathway' });
		}

		try {
			await db.insert(ambassadorPathway).values({
				userId,
				pathway,
				assignedBy: locals.user.id
			});
		} catch {
			return fail(400, { error: 'Already assigned to this pathway' });
		}

		return { success: true };
	},

	assignReviewer: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) {
			return fail(403, { error: 'Access denied' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		const pathway = formData.get('pathway') as Pathway;

		if (!userId || !pathway) {
			return fail(400, { error: 'User ID and pathway required' });
		}

		if (!validPathways.includes(pathway)) {
			return fail(400, { error: 'Invalid pathway' });
		}

		try {
			await db.insert(reviewerPathway).values({
				userId,
				pathway,
				assignedBy: locals.user.id
			});
		} catch (err) {
			if (err instanceof Error && 'code' in err && (err as { code: string }).code === '23505') {
				return fail(400, { error: 'Already assigned to this pathway' });
			}
			return fail(500, { error: 'Failed to assign pathway' });
		}

		return { success: true };
	},

	removeAmbassador: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) {
			return fail(403, { error: 'Access denied' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		const pathway = formData.get('pathway') as Pathway;

		if (!userId || !pathway) {
			return fail(400, { error: 'User ID and pathway required' });
		}

		await db.delete(ambassadorPathway)
			.where(sql`${ambassadorPathway.userId} = ${userId} AND ${ambassadorPathway.pathway} = ${pathway}`);

		return { success: true };
	},

	removeReviewer: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) {
			return fail(403, { error: 'Access denied' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		const pathway = formData.get('pathway') as Pathway;

		if (!userId || !pathway) {
			return fail(400, { error: 'User ID and pathway required' });
		}

		await db.delete(reviewerPathway)
			.where(sql`${reviewerPathway.userId} = ${userId} AND ${reviewerPathway.pathway} = ${pathway}`);

		return { success: true };
	}
};
