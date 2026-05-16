// TODO: actually do this file
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import {
	shopItem,
	pathwayEnum,
	ambassadorPathway,
	warehouseOrderTemplate,
	warehouseOrderTemplateItem,
	warehouseItem
} from '$lib/server/db/schema';
import { and, eq, or } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
// import { PATHWAY_IDS, type PathwayId } from '$lib/pathways';
import { z } from 'zod';
import { PATHWAYS, type PathwayId } from '$lib/pathways';

// steps:
// 1. get all orders which having a state of 'PENDING'
// 2. get associated order data
// 3. display to frontend