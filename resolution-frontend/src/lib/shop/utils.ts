import { db } from '$lib/server/db';
import {
	userPathway,
	pathwayShop,
} from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import { PATHWAY_IDS, type PathwayId } from '$lib/pathways';

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export class shopError extends Error {
    constructor(public status: number, public body: { message: string }) {
        super(body.message);
    }
}

export async function assertShopAccess(userId: string, pathwayParam: string, conn: DbOrTx = db) {
    const pathwayId = pathwayParam.toUpperCase();
    if (!PATHWAY_IDS.includes(pathwayId as PathwayId)) throw error(404, 'Pathway not found');
    const typedPathwayId = pathwayId as PathwayId;

    const membership = await conn
        .select()
        .from(userPathway)
        .where(and(eq(userPathway.userId, userId), eq(userPathway.pathway, typedPathwayId)))
        .limit(1);
    if (membership.length === 0) throw redirect(302, '/app');

    const pathwayShopRow = await conn
        .select()
        .from(pathwayShop)
        .where(eq(pathwayShop.pathway, typedPathwayId))
        .limit(1);
    if (pathwayShopRow.length === 0 || !pathwayShopRow[0].isEnabled) {
        throw error(404);
    }

    return { typedPathwayId, shop: pathwayShopRow[0] };
}