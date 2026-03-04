import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { warehouseBatch, warehouseBatchTag, warehouseOrderTemplate, warehouseOrder, warehouseOrderItem, warehouseOrderTag, ambassadorPathway } from '$lib/server/db/schema';
import { eq, desc, asc } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';

function parseCsv(raw: string): string[][] {
	const rows: string[][] = [];
	const lines = raw.split(/\r?\n/);
	for (const line of lines) {
		if (!line.trim()) continue;
		const cells: string[] = [];
		let i = 0;
		while (i < line.length) {
			if (line[i] === '"') {
				let value = '';
				i++; // skip opening quote
				while (i < line.length) {
					if (line[i] === '"' && i + 1 < line.length && line[i + 1] === '"') {
						value += '"';
						i += 2;
					} else if (line[i] === '"') {
						i++; // skip closing quote
						break;
					} else {
						value += line[i];
						i++;
					}
				}
				cells.push(value);
				if (i < line.length && line[i] === ',') i++; // skip comma
			} else {
				let value = '';
				while (i < line.length && line[i] !== ',') {
					value += line[i];
					i++;
				}
				cells.push(value.trim());
				if (i < line.length && line[i] === ',') i++;
			}
		}
		rows.push(cells);
	}
	return rows;
}

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();

	const ambassadorCheck = await db
		.select({ userId: ambassadorPathway.userId })
		.from(ambassadorPathway)
		.where(eq(ambassadorPathway.userId, user.id))
		.limit(1);

	const isAmbassador = ambassadorCheck.length > 0;

	if (!user.isAdmin && !isAmbassador) {
		throw error(403, 'Access denied');
	}

	const batches = await db.query.warehouseBatch.findMany({
		where: eq(warehouseBatch.createdById, user.id),
		with: {
			createdBy: true,
			template: {
				with: {
					items: {
						with: {
							warehouseItem: true
						}
					}
				}
			},
			tags: true
		},
		orderBy: [desc(warehouseBatch.createdAt)]
	});

	const templates = await db.query.warehouseOrderTemplate.findMany({
		with: {
			items: {
				with: {
					warehouseItem: true
				}
			}
		},
		orderBy: [asc(warehouseOrderTemplate.name)]
	});

	const allTags = await db
		.selectDistinct({ tag: warehouseOrderTag.tag })
		.from(warehouseOrderTag)
		.orderBy(asc(warehouseOrderTag.tag));

	return {
		batches,
		templates,
		allTags: allTags.map((t) => t.tag)
	};
};

export const actions: Actions = {
	createBatch: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Not logged in' });

		const formData = await request.formData();
		const title = formData.get('title') as string;
		const templateId = formData.get('templateId') as string;
		const tagsString = formData.get('tags') as string;
		const csvData = formData.get('csvData') as string;

		if (!templateId || !csvData) {
			return fail(400, { error: 'Template and CSV data are required' });
		}

		const rows = parseCsv(csvData);
		const addressCount = rows.length > 1 ? rows.length - 1 : 0;

		const [batch] = await db.insert(warehouseBatch).values({
			createdById: user.id,
			templateId,
			title: title || null,
			csvData,
			addressCount
		}).returning({ id: warehouseBatch.id });

		if (tagsString && tagsString.trim()) {
			const tags = tagsString.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
			if (tags.length > 0) {
				await db.insert(warehouseBatchTag).values(
					tags.map((tag) => ({ batchId: batch.id, tag }))
				);
			}
		}

		return { success: true, batchId: batch.id };
	},

	mapFields: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Not logged in' });

		const formData = await request.formData();
		const batchId = formData.get('batchId') as string;
		const fieldMapping = formData.get('fieldMapping') as string;

		if (!batchId || !fieldMapping) {
			return fail(400, { error: 'Batch ID and field mapping are required' });
		}

		await db.update(warehouseBatch)
			.set({ fieldMapping, status: 'MAPPED', updatedAt: new Date() })
			.where(eq(warehouseBatch.id, batchId));

		return { success: true };
	},

	processBatch: async ({ request, locals }) => {
		const user = locals.user;
		if (!user) return fail(401, { error: 'Not logged in' });

		const formData = await request.formData();
		const batchId = formData.get('batchId') as string;

		if (!batchId) return fail(400, { error: 'Batch ID is required' });

		const batch = await db.query.warehouseBatch.findFirst({
			where: eq(warehouseBatch.id, batchId),
			with: {
				template: {
					with: {
						items: true
					}
				},
				tags: true
			}
		});

		if (!batch) return fail(404, { error: 'Batch not found' });
		if (batch.status !== 'MAPPED') return fail(400, { error: 'Batch must be mapped before processing' });
		if (!batch.fieldMapping) return fail(400, { error: 'No field mapping found' });

		const mapping: Record<string, string> = JSON.parse(batch.fieldMapping);
		const rows = parseCsv(batch.csvData);

		if (rows.length < 2) return fail(400, { error: 'CSV has no data rows' });

		const headers = rows[0];
		const dataRows = rows.slice(1);

		for (const row of dataRows) {
			const getValue = (field: string): string => {
				const colName = mapping[field];
				if (!colName) return '';
				const colIndex = headers.indexOf(colName);
				if (colIndex === -1) return '';
				return (row[colIndex] || '').trim();
			};

			const firstName = getValue('firstName');
			const lastName = getValue('lastName');
			const email = getValue('email');
			const addressLine1 = getValue('addressLine1');
			const city = getValue('city');
			const stateProvince = getValue('stateProvince');
			const country = getValue('country');

			if (!firstName || !lastName || !email || !addressLine1 || !city || !stateProvince || !country) {
				continue;
			}

			const [order] = await db.insert(warehouseOrder).values({
				createdById: user.id,
				batchId,
				firstName,
				lastName,
				email,
				phone: getValue('phone') || null,
				addressLine1,
				addressLine2: getValue('addressLine2') || null,
				city,
				stateProvince,
				postalCode: getValue('postalCode') || null,
				country
			}).returning({ id: warehouseOrder.id });

			if (batch.template.items.length > 0) {
				await db.insert(warehouseOrderItem).values(
					batch.template.items.map((ti) => ({
						orderId: order.id,
						warehouseItemId: ti.warehouseItemId,
						quantity: ti.quantity
					}))
				);
			}

			if (batch.tags.length > 0) {
				await db.insert(warehouseOrderTag).values(
					batch.tags.map((t) => ({
						orderId: order.id,
						tag: t.tag
					}))
				);
			}
		}

		await db.update(warehouseBatch)
			.set({ status: 'PROCESSED', updatedAt: new Date() })
			.where(eq(warehouseBatch.id, batchId));

		return { success: true };
	}
};
