import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { ambassadorPathway, referralLink, referralSignup, user } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { createId } from '@paralleldrive/cuid2';
import { PATHWAY_IDS } from '$lib/pathways';

function generateReferralCode(): string {
	return createId().slice(0, 8);
}

export const load: PageServerLoad = async ({ locals }) => {
	const currentUser = locals.user;
	if (!currentUser) {
		throw error(401, 'Unauthorized');
	}

	const [assignments, links] = await Promise.all([
		db
			.select()
			.from(ambassadorPathway)
			.where(eq(ambassadorPathway.userId, currentUser.id)),
		db
			.select()
			.from(referralLink)
			.where(eq(referralLink.ambassadorId, currentUser.id))
	]);

	if (assignments.length === 0 && !currentUser.isAdmin) {
		throw error(403, 'You are not an ambassador');
	}

	const signupRows = links.length > 0
		? await db
			.select({
				referralLinkId: referralSignup.referralLinkId,
				id: referralSignup.id,
				createdAt: referralSignup.createdAt,
				userId: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email
			})
			.from(referralSignup)
			.innerJoin(user, eq(referralSignup.userId, user.id))
			.where(inArray(referralSignup.referralLinkId, links.map((link) => link.id)))
		: [];

	const signupsByLinkId = new Map<string, Omit<(typeof signupRows)[number], 'referralLinkId'>[]>();
	for (const row of signupRows) {
		const { referralLinkId, ...signup } = row;
		const signups = signupsByLinkId.get(referralLinkId) ?? [];
		signups.push(signup);
		signupsByLinkId.set(referralLinkId, signups);
	}

	const linksWithSignups = links.map((link) => ({
		...link,
		signups: signupsByLinkId.get(link.id) ?? []
	}));

	return {
		assignments: assignments.map((a) => a.pathway),
		referralLinks: linksWithSignups
	};
};

export const actions: Actions = {
	createLink: async ({ request, locals }) => {
		if (!locals.user || !locals.session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const pathway = formData.get('pathway') as string;
		const label = formData.get('label') as string | null;
		const customSlug = (formData.get('slug') as string | null)?.trim() || null;

		const validPathways = PATHWAY_IDS;
		if (!pathway || !validPathways.includes(pathway)) {
			return fail(400, { error: 'Invalid pathway' });
		}

		let code: string;
		if (customSlug) {
			if (!/^[a-zA-Z0-9_-]{3,32}$/.test(customSlug)) {
				return fail(400, { error: 'Slug must be 3-32 characters, letters, numbers, hyphens, or underscores only' });
			}
			const existing = await db.query.referralLink.findFirst({
				where: eq(referralLink.code, customSlug)
			});
			if (existing) {
				return fail(400, { error: 'That slug is already taken' });
			}
			code = customSlug;
		} else {
			code = generateReferralCode();
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

		await db.insert(referralLink).values({
			ambassadorId: locals.user.id,
			pathway: pathway as any,
			code,
			label: label || null
		});

		return { success: true };
	},

	toggleLink: async ({ request, locals }) => {
		if (!locals.user || !locals.session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const linkId = formData.get('linkId') as string;

		if (!linkId) {
			return fail(400, { error: 'Missing link ID' });
		}

		const link = await db.query.referralLink.findFirst({
			where: and(eq(referralLink.id, linkId), eq(referralLink.ambassadorId, locals.user.id))
		});

		if (!link) {
			return fail(404, { error: 'Link not found' });
		}

		await db
			.update(referralLink)
			.set({ isActive: !link.isActive })
			.where(eq(referralLink.id, linkId));

		return { success: true };
	},

	deleteLink: async ({ request, locals }) => {
		if (!locals.user || !locals.session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const linkId = formData.get('linkId') as string;

		if (!linkId) {
			return fail(400, { error: 'Missing link ID' });
		}

		const link = await db.query.referralLink.findFirst({
			where: and(eq(referralLink.id, linkId), eq(referralLink.ambassadorId, locals.user.id))
		});

		if (!link) {
			return fail(404, { error: 'Link not found' });
		}

		await db.delete(referralLink).where(eq(referralLink.id, linkId));

		return { success: true };
	}
};
