/**
 * Action-level tests for the shop item creation page. Covers all three
 * "source" types — CUSTOM, WAREHOUSE_ITEM, and WAREHOUSE_TEMPLATE — with
 * the db, including warehouse lookups, fully mocked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

type Queue = unknown[];

function makeChain(queue: Queue) {
	const handler: ProxyHandler<object> = {
		get(_, prop) {
			if (prop === 'then') {
				const value = queue.length > 0 ? queue.shift() : undefined;
				const p = Promise.resolve(value);
				return p.then.bind(p);
			}
			return () => proxy;
		}
	};
	const proxy: object = new Proxy({}, handler);
	return proxy;
}

const insertQueue: Queue = [];
const selectQueue: Queue = [];

const mockAmbassadorFindFirst = vi.fn();
const mockWarehouseItemFindFirst = vi.fn();
const mockWarehouseTemplateFindFirst = vi.fn();

vi.mock('$lib/server/db', () => ({
	db: {
		query: {
			ambassadorPathway: {
				findFirst: (...args: unknown[]) => mockAmbassadorFindFirst(...args)
			},
			warehouseItem: {
				findFirst: (...args: unknown[]) => mockWarehouseItemFindFirst(...args)
			},
			warehouseOrderTemplate: {
				findFirst: (...args: unknown[]) => mockWarehouseTemplateFindFirst(...args)
			}
		},
		select: () => makeChain(selectQueue),
		insert: () => makeChain(insertQueue)
	}
}));

const { actions } = await import('./+page.server');

function makeFormData(data: Record<string, string>) {
	return {
		formData: async () => {
			const fd = new FormData();
			for (const [k, v] of Object.entries(data)) fd.append(k, v);
			return fd;
		}
	};
}

function makeEvent(opts: {
	form: Record<string, string>;
	pathway?: string;
	user?: { id: string } | null;
}) {
	const { form, pathway = 'python', user = { id: 'amb-1' } } = opts;
	return {
		request: makeFormData(form),
		params: { pathway },
		locals: { user }
	} as any;
}

beforeEach(() => {
	insertQueue.length = 0;
	selectQueue.length = 0;
	vi.clearAllMocks();
});

// ---- createCustom -----------------------------------------------------------

describe('createCustom action', () => {
	const validForm = {
		name: 'Free Sticker',
		description: 'A sticker as a grant reward.',
		imageUrl: 'https://example.com/sticker.png',
		price: '0',
		stock: '10'
	};

	it('inserts a CUSTOM shop item and returns it', async () => {
		mockAmbassadorFindFirst.mockResolvedValue({ id: 'ap-1' });
		insertQueue.push([{ id: 'item-1', name: 'Free Sticker', sourceType: 'CUSTOM' }]);

		const event = makeEvent({ form: validForm });
		const result = await actions.createCustom(event);

		expect(result).toEqual({
			success: true,
			item: { id: 'item-1', name: 'Free Sticker', sourceType: 'CUSTOM' }
		});
	});

	it('rejects unauthenticated users with a redirect', async () => {
		const event = makeEvent({ form: validForm, user: null });
		await expect(actions.createCustom(event)).rejects.toMatchObject({ status: 302 });
	});

	it('throws 404 for an invalid pathway slug', async () => {
		const event = makeEvent({ form: validForm, pathway: 'imaginary' });
		await expect(actions.createCustom(event)).rejects.toMatchObject({ status: 404 });
	});

	it('throws 403 when the caller is not an ambassador for the pathway', async () => {
		mockAmbassadorFindFirst.mockResolvedValue(undefined);

		const event = makeEvent({ form: validForm });
		await expect(actions.createCustom(event)).rejects.toMatchObject({ status: 403 });
	});

	it('throws 400 on invalid form data', async () => {
		mockAmbassadorFindFirst.mockResolvedValue({ id: 'ap-1' });

		const event = makeEvent({
			form: { ...validForm, imageUrl: 'not a url' }
		});
		await expect(actions.createCustom(event)).rejects.toMatchObject({ status: 400 });
	});
});

// ---- createWarehouse --------------------------------------------------------

describe('createWarehouse action', () => {
	const validForm = {
		id: 'wh-1',
		name: '',
		description: 'Pulled from warehouse stock.',
		price: '15'
	};

	it('inserts a WAREHOUSE_ITEM-backed shop item using warehouse defaults', async () => {
		mockAmbassadorFindFirst.mockResolvedValue({ id: 'ap-1' });
		mockWarehouseItemFindFirst.mockResolvedValue({
			id: 'wh-1',
			name: 'Holographic Sticker',
			imageUrl: 'https://example.com/holo.png',
			quantity: 42
		});
		insertQueue.push([
			{ id: 'shop-1', name: 'Holographic Sticker', sourceType: 'WAREHOUSE_ITEM' }
		]);

		const event = makeEvent({ form: validForm });
		const result = await actions.createWarehouse(event);

		expect(result).toMatchObject({
			success: true,
			item: { sourceType: 'WAREHOUSE_ITEM' }
		});
	});

	it('throws 404 when the linked warehouse item does not exist', async () => {
		mockAmbassadorFindFirst.mockResolvedValue({ id: 'ap-1' });
		mockWarehouseItemFindFirst.mockResolvedValue(undefined);

		const event = makeEvent({ form: validForm });
		await expect(actions.createWarehouse(event)).rejects.toMatchObject({ status: 404 });
	});

	it('throws 403 for non-ambassadors', async () => {
		mockAmbassadorFindFirst.mockResolvedValue(undefined);
		const event = makeEvent({ form: validForm });
		await expect(actions.createWarehouse(event)).rejects.toMatchObject({ status: 403 });
	});
});

// ---- createWarehouseTemplate ------------------------------------------------

describe('createWarehouseTemplate action', () => {
	const validForm = {
		id: 'tpl-1',
		name: 'Starter Pack',
		description: 'Bundle of stickers and a pin.',
		imageUrl: 'https://example.com/bundle.png',
		price: '50'
	};

	it('computes max stock from the cheapest template component and inserts the shop item', async () => {
		mockAmbassadorFindFirst.mockResolvedValue({ id: 'ap-1' });
		mockWarehouseTemplateFindFirst.mockResolvedValue({
			id: 'tpl-1',
			name: 'Starter Pack',
			createdById: 'amb-1',
			isPublic: false
		});
		// Template-items join lookup: 3 stickers (stock 30 → 10) and 1 pin (stock 8 → 8).
		// min(10, 8) = 8 expected stock.
		selectQueue.push([
			{ perOrder: 3, available: 30 },
			{ perOrder: 1, available: 8 }
		]);
		insertQueue.push([
			{ id: 'shop-2', name: 'Starter Pack', sourceType: 'WAREHOUSE_TEMPLATE', stock: 8 }
		]);

		const event = makeEvent({ form: validForm });
		const result = await actions.createWarehouseTemplate(event);

		expect(result).toMatchObject({
			success: true,
			item: { sourceType: 'WAREHOUSE_TEMPLATE', stock: 8 }
		});
	});

	it('throws 400 if the template has no items', async () => {
		mockAmbassadorFindFirst.mockResolvedValue({ id: 'ap-1' });
		mockWarehouseTemplateFindFirst.mockResolvedValue({
			id: 'tpl-1',
			name: 'Empty',
			createdById: 'amb-1',
			isPublic: false
		});
		selectQueue.push([]);

		const event = makeEvent({ form: validForm });
		await expect(actions.createWarehouseTemplate(event)).rejects.toMatchObject({ status: 400 });
	});

	it('throws 403 when caller is not the template owner and template is private', async () => {
		mockAmbassadorFindFirst.mockResolvedValue({ id: 'ap-1' });
		mockWarehouseTemplateFindFirst.mockResolvedValue({
			id: 'tpl-1',
			name: 'Other',
			createdById: 'somebody-else',
			isPublic: false
		});

		const event = makeEvent({ form: validForm });
		await expect(actions.createWarehouseTemplate(event)).rejects.toMatchObject({ status: 403 });
	});

	it('throws 404 when template not found', async () => {
		mockAmbassadorFindFirst.mockResolvedValue({ id: 'ap-1' });
		mockWarehouseTemplateFindFirst.mockResolvedValue(undefined);

		const event = makeEvent({ form: validForm });
		await expect(actions.createWarehouseTemplate(event)).rejects.toMatchObject({ status: 404 });
	});
});
