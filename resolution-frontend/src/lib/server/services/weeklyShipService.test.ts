import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindFirstShip = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();

vi.mock('../db', () => ({
	db: {
		query: {
			weeklyShip: { findFirst: (...args: unknown[]) => mockFindFirstShip(...args) }
		},
		update: () => ({
			set: () => ({
				where: () => ({
					returning: () => mockUpdate()
				})
			})
		}),
		insert: () => ({
			values: () => ({
				returning: () => mockInsert()
			})
		})
	}
}));

const { WeeklyShipService } = await import('./weeklyShipService');

beforeEach(() => {
	vi.clearAllMocks();
});

describe('WeeklyShipService.createShip', () => {
	it('creates a new ship with PLANNED status', async () => {
		const created = {
			id: 'ship1',
			userId: 'u1',
			seasonId: 's1',
			weekNumber: 1,
			goalText: 'Build something',
			status: 'PLANNED'
		};
		mockInsert.mockResolvedValue([created]);

		const result = await WeeklyShipService.createShip({
			userId: 'u1',
			seasonId: 's1',
			weekNumber: 1,
			goalText: 'Build something'
		});
		expect(result).toEqual(created);
	});
});

describe('WeeklyShipService.markShipped', () => {
	it('marks a ship as shipped when user owns it', async () => {
		const existing = { id: 'ship1', userId: 'u1', status: 'PLANNED' };
		mockFindFirstShip.mockResolvedValue(existing);
		const updated = { ...existing, status: 'SHIPPED', proofUrl: 'https://proof.com' };
		mockUpdate.mockResolvedValue([updated]);

		const result = await WeeklyShipService.markShipped('ship1', 'u1', 'https://proof.com');
		expect(result.status).toBe('SHIPPED');
	});

	it('throws when ship not found', async () => {
		mockFindFirstShip.mockResolvedValue(null);
		await expect(
			WeeklyShipService.markShipped('missing', 'u1', 'https://proof.com')
		).rejects.toThrow('Ship not found or access denied');
	});

	it('throws when user does not own the ship', async () => {
		mockFindFirstShip.mockResolvedValue({ id: 'ship1', userId: 'other-user' });
		await expect(
			WeeklyShipService.markShipped('ship1', 'u1', 'https://proof.com')
		).rejects.toThrow('Ship not found or access denied');
	});
});

describe('WeeklyShipService.updateStatus', () => {
	it('updates status when user owns the ship', async () => {
		const existing = { id: 'ship1', userId: 'u1', status: 'PLANNED' };
		mockFindFirstShip.mockResolvedValue(existing);
		const updated = { ...existing, status: 'IN_PROGRESS' };
		mockUpdate.mockResolvedValue([updated]);

		const result = await WeeklyShipService.updateStatus('ship1', 'u1', 'IN_PROGRESS');
		expect(result.status).toBe('IN_PROGRESS');
	});

	it('throws when user does not own the ship', async () => {
		mockFindFirstShip.mockResolvedValue({ id: 'ship1', userId: 'other-user' });
		await expect(
			WeeklyShipService.updateStatus('ship1', 'u1', 'SHIPPED')
		).rejects.toThrow('Ship not found or access denied');
	});
});
