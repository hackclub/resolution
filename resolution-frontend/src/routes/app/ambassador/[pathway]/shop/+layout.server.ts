import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { ambassadorPathway } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { PATHWAY_IDS, type PathwayId } from '$lib/pathways';

export const load: LayoutServerLoad = async ({ params, parent }) => {
	const { user } = await parent();

	const raw = params.pathway.toUpperCase();
	if (!PATHWAY_IDS.includes(raw)) throw error(404, 'Pathway not found');
	const pathwayId = raw as PathwayId;

	const isAmbassador = await db.query.ambassadorPathway.findFirst({
		where: and(
			eq(ambassadorPathway.userId, user.id),
			eq(ambassadorPathway.pathway, pathwayId)
		)
	});
	if (!isAmbassador) throw error(403, 'You are not an ambassador for this pathway');

	return { pathwayId };
};
