/**
 * Action-level tests for the shop fulfill page. We mock the db (drizzle's
 * fluent builder), packaging/shipping helpers, and HCB so the tests run
 * with no real warehouse items and no live HCB integration — mirroring a
 * local dev environment.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- db mock ----------------------------------------------------------------

type Queue = unknown[];

/**
 * Drizzle's query builder is chainable (e.g. db.select().from().where()).
 * This proxy lets any chain end in an awaited value pulled from a queue,
 * so each test can pre-seed the values its action will see.
 */
function makeChain(queue: Queue) {
	const handler: ProxyHandler<object> = {
		get(_, prop) {
			if (prop === 'then') {
				const value = queue.length > 0 ? queue.shift() : undefined;
				const p = Promise.resolve(value);
				return p.then.bind(p);
			}
			if (prop === 'catch') {
				const p = Promise.resolve(undefined);
				return p.catch.bind(p);
			}
			return () => proxy;
		}
	};
	const proxy: object = new Proxy({}, handler);
	return proxy;
}

const selectQueue: Queue = [];
const insertQueue: Queue = [];
const updateQueue: Queue = [];

const txSelectQueue: Queue = [];
const txInsertQueue: Queue = [];
const txUpdateQueue: Queue = [];

const mockAmbassadorFindFirst = vi.fn();
const mockShopOrderFindFirst = vi.fn();

vi.mock('$lib/server/db', () => ({
	db: {
		query: {
			ambassadorPathway: {
				findFirst: (...args: unknown[]) => mockAmbassadorFindFirst(...args)
			},
			shopOrder: {
				findFirst: (...args: unknown[]) => mockShopOrderFindFirst(...args)
			}
		},
		select: () => makeChain(selectQueue),
		insert: () => makeChain(insertQueue),
		update: () => makeChain(updateQueue),
		transaction: async (cb: (tx: unknown) => Promise<unknown>) => {
			const tx = {
				select: () => makeChain(txSelectQueue),
				insert: () => makeChain(txInsertQueue),
				update: () => makeChain(txUpdateQueue)
			};
			return cb(tx);
		}
	}
}));

// ---- external helper mocks --------------------------------------------------

const mockSelectPackaging = vi.fn();
const mockFetchCheapestRate = vi.fn();
const mockGetOrgIdForPathway = vi.fn();
const mockCreateHcbTransfer = vi.fn();
const mockResolveCountryCode = vi.fn();

vi.mock('$lib/server/packaging', () => ({
	selectPackaging: (...args: unknown[]) => mockSelectPackaging(...args)
}));
vi.mock('$lib/server/canada-post', () => ({
	fetchCheapestRate: (...args: unknown[]) => mockFetchCheapestRate(...args)
}));
vi.mock('$lib/server/hcb', () => ({
	getOrgIdForPathway: (...args: unknown[]) => mockGetOrgIdForPathway(...args),
	createHcbTransfer: (...args: unknown[]) => mockCreateHcbTransfer(...args)
}));
vi.mock('$lib/server/countries', () => ({
	resolveCountryCode: (...args: unknown[]) => mockResolveCountryCode(...args)
}));

const { actions } = await import('./+page.server');

// ---- helpers ----------------------------------------------------------------

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

const SAMPLE_ADDRESS = {
	addressLine1: '15 Falls Rd',
	addressLine2: '',
	city: 'Shelburne',
	stateProvince: 'VT',
	country: 'United States',
	zipPostalCode: '05482'
};

const SAMPLE_USER = {
	id: 'user-1',
	email: 'buyer@example.com',
	firstName: 'Buyer',
	lastName: 'Person'
};

const SAMPLE_PACKAGING = {
	category: 'box' as const,
	label: 'small box',
	lengthIn: 6,
	widthIn: 4,
	heightIn: 2,
	weightGrams: 200,
	subjectToChange: false
};

function reset() {
	selectQueue.length = 0;
	insertQueue.length = 0;
	updateQueue.length = 0;
	txSelectQueue.length = 0;
	txInsertQueue.length = 0;
	txUpdateQueue.length = 0;
	vi.clearAllMocks();
	mockGetOrgIdForPathway.mockReturnValue(null); // simulate no HCB linked
	mockResolveCountryCode.mockReturnValue('US');
	mockSelectPackaging.mockReturnValue(SAMPLE_PACKAGING);
	mockFetchCheapestRate.mockResolvedValue({ shippingCostUsd: 5, serviceName: 'Test Mail' });
}

beforeEach(reset);

// ---- deny tests -------------------------------------------------------------

describe('deny action', () => {
	it('marks the order as REJECTED with the provided reason', async () => {
		mockAmbassadorFindFirst.mockResolvedValue({ id: 'ap-1' });
		mockShopOrderFindFirst.mockResolvedValue({
			id: 'order-1',
			pathway: 'PYTHON',
			item: null,
			user: SAMPLE_USER
		});
		// `db.update(shopOrder).set(...).where(...)` — pop one value (unused).
		updateQueue.push(undefined);

		const event = makeEvent({ form: { id: 'order-1', note: 'spammy address' } });
		const result = await actions.deny(event);

		expect(result).toEqual({ success: true, orderId: 'order-1' });
	});

	it('throws 403 when caller is not an ambassador for the pathway', async () => {
		mockAmbassadorFindFirst.mockResolvedValue(undefined);

		const event = makeEvent({ form: { id: 'order-1', note: 'no' } });
		await expect(actions.deny(event)).rejects.toMatchObject({ status: 403 });
	});

	it('throws 400 when input validation fails (missing required reason)', async () => {
		mockAmbassadorFindFirst.mockResolvedValue({ id: 'ap-1' });

		const event = makeEvent({ form: { id: 'order-1' } });
		await expect(actions.deny(event)).rejects.toMatchObject({ status: 400 });
	});

	it('redirects to login when not authenticated', async () => {
		const event = makeEvent({ form: { id: 'order-1', note: 'x' }, user: null });
		await expect(actions.deny(event)).rejects.toMatchObject({ status: 302 });
	});

	it('throws 404 for unknown pathway in URL', async () => {
		const event = makeEvent({ form: { id: 'order-1', note: 'x' }, pathway: 'not_a_pathway' });
		await expect(actions.deny(event)).rejects.toMatchObject({ status: 404 });
	});

	it('throws 400 when order id does not exist', async () => {
		mockAmbassadorFindFirst.mockResolvedValue({ id: 'ap-1' });
		mockShopOrderFindFirst.mockResolvedValue(undefined);

		const event = makeEvent({ form: { id: 'missing', note: 'x' } });
		await expect(actions.deny(event)).rejects.toMatchObject({ status: 400 });
	});
});

// ---- approve tests ----------------------------------------------------------

describe('approve action — CUSTOM items', () => {
	it('marks the order FULFILLED without touching the warehouse', async () => {
		mockAmbassadorFindFirst.mockResolvedValue({ id: 'ap-1' });
		mockShopOrderFindFirst.mockResolvedValue({
			id: 'order-1',
			pathway: 'PYTHON',
			item: { id: 'item-1', sourceType: 'CUSTOM', linkedWarehouseItemId: null, linkedWarehouseTemplateId: null },
			user: SAMPLE_USER,
			shippingAddress: SAMPLE_ADDRESS
		});
		// The CUSTOM branch wraps the shopOrder update in a transaction.
		txUpdateQueue.push(undefined);

		const event = makeEvent({ form: { id: 'order-1', note: 'gifted manually' } });
		const result = await actions.approve(event);

		expect(result).toEqual({ success: true });
		expect(mockFetchCheapestRate).not.toHaveBeenCalled();
		expect(mockCreateHcbTransfer).not.toHaveBeenCalled();
	});
});

describe('approve action — WAREHOUSE_ITEM', () => {
	const baseOrder = {
		id: 'order-2',
		pathway: 'PYTHON',
		item: {
			id: 'shop-item-1',
			sourceType: 'WAREHOUSE_ITEM',
			linkedWarehouseItemId: 'wh-1',
			linkedWarehouseTemplateId: null
		},
		user: SAMPLE_USER,
		shippingAddress: SAMPLE_ADDRESS,
		phone: '555-0100'
	};

	it('creates a warehouse order and decrements stock when HCB is not linked', async () => {
		mockAmbassadorFindFirst.mockResolvedValue({ id: 'ap-1' });
		mockShopOrderFindFirst.mockResolvedValue(baseOrder);
		// Stock lookup: one warehouse item with plenty of stock.
		selectQueue.push([
			{
				id: 'wh-1',
				name: 'Sticker',
				quantity: 10,
				costCents: 100,
				lengthIn: 6,
				widthIn: 4,
				heightIn: 0.5,
				weightGrams: 50,
				packageType: 'flat'
			}
		]);
		// Inside transaction: warehouseOrder insert returns the new id, then
		// per-line insert returns nothing, then the stock-decrement update
		// must return a row to satisfy the "another order claimed it" check,
		// then the shopOrder update is awaited.
		txInsertQueue.push([{ id: 'wo-1' }]); // warehouseOrder insert
		txInsertQueue.push(undefined); // warehouseOrderItem insert
		txUpdateQueue.push([{ id: 'wh-1' }]); // decrement stock
		txUpdateQueue.push(undefined); // shopOrder update
		// After tx, billing branch: getOrgIdForPathway → null (no HCB), so we
		// hit `db.update(warehouseOrder).set({billingStatus: 'NOT_APPLICABLE'})`.
		updateQueue.push(undefined);

		const event = makeEvent({ form: { id: 'order-2' } });
		const result = await actions.approve(event);

		expect(result).toEqual({ success: true, warehouseOrderId: 'wo-1' });
		expect(mockGetOrgIdForPathway).toHaveBeenCalledWith('PYTHON');
		expect(mockCreateHcbTransfer).not.toHaveBeenCalled();
		expect(mockFetchCheapestRate).toHaveBeenCalled();
	});

	it('returns a 400 ActionFailure when stock is insufficient', async () => {
		mockAmbassadorFindFirst.mockResolvedValue({ id: 'ap-1' });
		mockShopOrderFindFirst.mockResolvedValue(baseOrder);
		// Stock lookup: not enough quantity (0 < 1).
		selectQueue.push([
			{
				id: 'wh-1',
				name: 'Sticker',
				quantity: 0,
				costCents: 100,
				lengthIn: 6,
				widthIn: 4,
				heightIn: 0.5,
				weightGrams: 50,
				packageType: 'flat'
			}
		]);

		const event = makeEvent({ form: { id: 'order-2' } });
		const result = await actions.approve(event);

		// fail() returns an ActionFailure object, not a thrown error.
		expect(result).toMatchObject({
			status: 400,
			data: { error: expect.stringContaining('Insufficient stock') }
		});
	});

	it('errors when the shop item lost its warehouse link', async () => {
		mockAmbassadorFindFirst.mockResolvedValue({ id: 'ap-1' });
		mockShopOrderFindFirst.mockResolvedValue({
			...baseOrder,
			item: { ...baseOrder.item, linkedWarehouseItemId: null }
		});

		const event = makeEvent({ form: { id: 'order-2' } });
		await expect(actions.approve(event)).rejects.toMatchObject({ status: 400 });
	});
});

describe('approve action — WAREHOUSE_TEMPLATE', () => {
	const baseOrder = {
		id: 'order-3',
		pathway: 'PYTHON',
		item: {
			id: 'shop-item-2',
			sourceType: 'WAREHOUSE_TEMPLATE',
			linkedWarehouseItemId: null,
			linkedWarehouseTemplateId: 'tpl-1'
		},
		user: SAMPLE_USER,
		shippingAddress: SAMPLE_ADDRESS,
		phone: null
	};

	it('expands the template into multiple line items and creates the warehouse order', async () => {
		mockAmbassadorFindFirst.mockResolvedValue({ id: 'ap-1' });
		mockShopOrderFindFirst.mockResolvedValue(baseOrder);
		// Template items lookup (`db.select().from(warehouseOrderTemplateItem)`).
		selectQueue.push([
			{ id: 'ti-1', templateId: 'tpl-1', warehouseItemId: 'wh-1', quantity: 2 },
			{ id: 'ti-2', templateId: 'tpl-1', warehouseItemId: 'wh-2', quantity: 1 }
		]);
		// Stock lookup for both warehouse items.
		selectQueue.push([
			{
				id: 'wh-1', name: 'Sticker', quantity: 50,
				costCents: 100, lengthIn: 6, widthIn: 4, heightIn: 0.5,
				weightGrams: 50, packageType: 'flat'
			},
			{
				id: 'wh-2', name: 'Pin', quantity: 30,
				costCents: 250, lengthIn: 1, widthIn: 1, heightIn: 0.5,
				weightGrams: 20, packageType: 'flat'
			}
		]);
		// Transaction queues:
		txInsertQueue.push([{ id: 'wo-2' }]); // warehouseOrder
		txInsertQueue.push(undefined); // warehouseOrderItem insert (wh-1)
		txInsertQueue.push(undefined); // warehouseOrderItem insert (wh-2)
		// Two stock decrement updates, then the shopOrder transition.
		txUpdateQueue.push([{ id: 'wh-1' }]);
		txUpdateQueue.push([{ id: 'wh-2' }]);
		txUpdateQueue.push(undefined); // shopOrder update
		// Post-tx billing branch: no HCB, so one update to mark NOT_APPLICABLE.
		updateQueue.push(undefined);

		const event = makeEvent({ form: { id: 'order-3' } });
		const result = await actions.approve(event);

		expect(result).toEqual({ success: true, warehouseOrderId: 'wo-2' });
		// 1 wo + 2 line item inserts inside the tx.
		expect(mockCreateHcbTransfer).not.toHaveBeenCalled();
	});

	it('errors when the template has no items', async () => {
		mockAmbassadorFindFirst.mockResolvedValue({ id: 'ap-1' });
		mockShopOrderFindFirst.mockResolvedValue(baseOrder);
		selectQueue.push([]); // empty template

		const event = makeEvent({ form: { id: 'order-3' } });
		await expect(actions.approve(event)).rejects.toMatchObject({ status: 400 });
	});
});

describe('approve action — auth & validation', () => {
	it('redirects to login when not authenticated', async () => {
		const event = makeEvent({ form: { id: 'order-1' }, user: null });
		await expect(actions.approve(event)).rejects.toMatchObject({ status: 302 });
	});

	it('throws 403 when caller is not an ambassador', async () => {
		mockAmbassadorFindFirst.mockResolvedValue(undefined);
		const event = makeEvent({ form: { id: 'order-1' } });
		await expect(actions.approve(event)).rejects.toMatchObject({ status: 403 });
	});

	it('throws 404 when pathway is not recognized', async () => {
		const event = makeEvent({ form: { id: 'order-1' }, pathway: 'martian' });
		await expect(actions.approve(event)).rejects.toMatchObject({ status: 404 });
	});

	it('throws 404 when the order id is not found', async () => {
		mockAmbassadorFindFirst.mockResolvedValue({ id: 'ap-1' });
		mockShopOrderFindFirst.mockResolvedValue(undefined);

		const event = makeEvent({ form: { id: 'missing' } });
		await expect(actions.approve(event)).rejects.toMatchObject({ status: 404 });
	});
});
