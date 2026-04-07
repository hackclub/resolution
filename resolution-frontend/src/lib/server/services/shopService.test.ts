import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks for db, email, hcb -- must come before importing the service.
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockQueryShopItem = vi.fn();
const mockQueryShopOrder = vi.fn();
const mockQueryUserPathway = vi.fn();
const mockQueryPathwayShop = vi.fn();
const mockQueryAmbassadorPathway = vi.fn();

vi.mock('../db', () => ({
	db: {
		query: {
			pathwayShop: { findFirst: (...a: unknown[]) => mockQueryPathwayShop(...a) },
			shopItem: { findFirst: (...a: unknown[]) => mockQueryShopItem(...a) },
			shopOrder: { findFirst: (...a: unknown[]) => mockQueryShopOrder(...a) },
			userPathway: { findFirst: (...a: unknown[]) => mockQueryUserPathway(...a) },
			ambassadorPathway: { findFirst: (...a: unknown[]) => mockQueryAmbassadorPathway(...a) }
		},
		select: (...a: unknown[]) => mockSelect(...a),
		insert: (...a: unknown[]) => mockInsert(...a),
		update: (...a: unknown[]) => mockUpdate(...a)
	}
}));

vi.mock('../email', () => ({
	sendFulfillmentEmail: vi.fn(async () => undefined)
}));

vi.mock('../hcb', () => ({
	createHcbTransfer: vi.fn(async () => ({ id: 'hcb_x' })),
	getOrgIdForPathway: (p: string) => `org_${p}`
}));

import { ShopService } from './shopService';
import { sendFulfillmentEmail } from '../email';

beforeEach(() => {
	vi.clearAllMocks();
});

function chainable(rowCount: number) {
	const chain: Record<string, unknown> = {};
	chain.set = vi.fn(() => chain);
	chain.where = vi.fn(async () => ({ rowCount }));
	chain.values = vi.fn(() => chain);
	chain.returning = vi.fn(async () => [{ id: 'shop_order_1' }]);
	return chain;
}

describe('ShopService.purchaseItem', () => {
	const baseAddress = {
		firstName: 'A',
		lastName: 'B',
		email: 'a@b.co',
		addressLine1: '1 Main',
		city: 'Town',
		stateProvince: 'CA',
		country: 'US'
	};

	it('rejects if item is missing or inactive', async () => {
		mockQueryShopItem.mockResolvedValueOnce(undefined);
		await expect(
			ShopService.purchaseItem('u1', 'PYTHON', 'item_x', 1, baseAddress)
		).rejects.toThrow(/not available/);
	});

	it('rejects if balance decrement affects 0 rows (insufficient balance)', async () => {
		mockQueryShopItem.mockResolvedValueOnce({
			id: 'item_1',
			pathway: 'PYTHON',
			isActive: true,
			costCurrency: 100
		});
		mockUpdate.mockReturnValueOnce(chainable(0));
		await expect(
			ShopService.purchaseItem('u1', 'PYTHON', 'item_1', 1, baseAddress)
		).rejects.toThrow(/Insufficient balance/);
	});

	it('inserts an order when balance decrement succeeds', async () => {
		mockQueryShopItem.mockResolvedValueOnce({
			id: 'item_1',
			pathway: 'PYTHON',
			isActive: true,
			costCurrency: 100
		});
		mockUpdate.mockReturnValueOnce(chainable(1));
		const insertOrderChain = {
			values: vi.fn().mockReturnThis(),
			returning: vi.fn(async () => [
				{ id: 'shop_order_1', userId: 'u1', pathway: 'PYTHON', status: 'PENDING' }
			])
		};
		const insertItemChain = { values: vi.fn(async () => undefined) };
		mockInsert.mockReturnValueOnce(insertOrderChain).mockReturnValueOnce(insertItemChain);

		const order = await ShopService.purchaseItem('u1', 'PYTHON', 'item_1', 2, baseAddress);
		expect(order.id).toBe('shop_order_1');
		expect(insertOrderChain.values).toHaveBeenCalled();
		expect(insertItemChain.values).toHaveBeenCalledWith(
			expect.objectContaining({ orderId: 'shop_order_1', shopItemId: 'item_1', quantity: 2 })
		);
	});
});

describe('ShopService.markFulfilledManual', () => {
	it('throws if no PENDING order matched', async () => {
		const chain = {
			set: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			returning: vi.fn(async () => [])
		};
		mockUpdate.mockReturnValueOnce(chain);
		await expect(
			ShopService.markFulfilledManual('order_x', { trackingNumber: 'T', carrier: 'UPS' })
		).rejects.toThrow(/not in PENDING/);
		expect(sendFulfillmentEmail).not.toHaveBeenCalled();
	});

	it('emails on success', async () => {
		const chain = {
			set: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			returning: vi.fn(async () => [{ id: 'o1', email: 'p@x', status: 'FULFILLED' }])
		};
		mockUpdate.mockReturnValueOnce(chain);
		await ShopService.markFulfilledManual('o1', { trackingNumber: 'T1', carrier: 'UPS' });
		expect(sendFulfillmentEmail).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'o1' }),
			{ trackingNumber: 'T1', carrier: 'UPS' }
		);
	});
});

describe('ShopService.sendOrdersToWarehouse validation', () => {
	function selectReturning<T>(rows: T[]) {
		const chain = {
			from: vi.fn().mockReturnThis(),
			innerJoin: vi.fn().mockReturnThis(),
			where: vi.fn().mockResolvedValue(rows)
		};
		mockSelect.mockReturnValueOnce(chain);
	}

	it('rejects empty selection', async () => {
		await expect(
			ShopService.sendOrdersToWarehouse([], {
				ambassadorUserId: 'a1',
				ambassadorIsAdmin: false,
				estimatedShippingCents: 0,
				estimatedServiceCode: 'X'
			})
		).rejects.toThrow(/No orders/);
	});

	it('rejects mixed users', async () => {
		selectReturning([
			{ id: 'o1', userId: 'u1', pathway: 'PYTHON', status: 'PENDING' },
			{ id: 'o2', userId: 'u2', pathway: 'PYTHON', status: 'PENDING' }
		]);
		await expect(
			ShopService.sendOrdersToWarehouse(['o1', 'o2'], {
				ambassadorUserId: 'a1',
				ambassadorIsAdmin: true,
				estimatedShippingCents: 0,
				estimatedServiceCode: 'X'
			})
		).rejects.toThrow(/same participant/);
	});

	it('rejects non-PENDING orders', async () => {
		selectReturning([{ id: 'o1', userId: 'u1', pathway: 'PYTHON', status: 'FULFILLED' }]);
		await expect(
			ShopService.sendOrdersToWarehouse(['o1'], {
				ambassadorUserId: 'a1',
				ambassadorIsAdmin: true,
				estimatedShippingCents: 0,
				estimatedServiceCode: 'X'
			})
		).rejects.toThrow(/not PENDING/);
	});

	it('rejects when a line item lacks a warehouseItemId link', async () => {
		selectReturning([
			{
				id: 'o1',
				userId: 'u1',
				pathway: 'PYTHON',
				status: 'PENDING',
				firstName: 'A',
				lastName: 'B',
				email: 'a@b',
				addressLine1: '1',
				city: 'C',
				stateProvince: 'S',
				country: 'US'
			}
		]);
		// second select call returns line items, one with no warehouseItemId
		selectReturning([
			{ orderId: 'o1', shopItemId: 'si1', quantity: 1, warehouseItemId: null }
		]);
		await expect(
			ShopService.sendOrdersToWarehouse(['o1'], {
				ambassadorUserId: 'a1',
				ambassadorIsAdmin: true,
				estimatedShippingCents: 0,
				estimatedServiceCode: 'X'
			})
		).rejects.toThrow(/not linked to a warehouse item/);
	});
});
