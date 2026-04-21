import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindFirstSeason = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();

vi.mock('../db', () => ({
	db: {
		query: {
			programSeason: { findFirst: (...args: unknown[]) => mockFindFirstSeason(...args) }
		},
		select: (...args: unknown[]) => {
			mockSelect(...args);
			return { from: (...a: unknown[]) => { mockFrom(...a); return { where: (...w: unknown[]) => { mockWhere(...w); return { limit: (...l: unknown[]) => mockLimit(...l) }; } }; } };
		}
	}
}));

const { ExceptionService } = await import('./exceptionService');

beforeEach(() => {
	vi.clearAllMocks();
});

describe('ExceptionService.getActiveException', () => {
	it('returns null when no active season exists', async () => {
		mockFindFirstSeason.mockResolvedValue(undefined);

		const result = await ExceptionService.getActiveException('user-1', 'PYTHON', 1);
		expect(result).toBeNull();
		expect(mockSelect).not.toHaveBeenCalled();
	});

	it('returns null when no exception found', async () => {
		mockFindFirstSeason.mockResolvedValue({ id: 'season-1', isActive: true });
		mockLimit.mockResolvedValue([]);

		const result = await ExceptionService.getActiveException('user-1', 'PYTHON', 1);
		expect(result).toBeNull();
	});

	it('returns exception when a valid one exists', async () => {
		const exception = { id: 'exc-1', expiresAt: new Date('2026-06-01') };
		mockFindFirstSeason.mockResolvedValue({ id: 'season-1', isActive: true });
		mockLimit.mockResolvedValue([exception]);

		const result = await ExceptionService.getActiveException('user-1', 'PYTHON', 1);
		expect(result).toEqual(exception);
	});

	it('queries with correct season id', async () => {
		mockFindFirstSeason.mockResolvedValue({ id: 'season-42', isActive: true });
		mockLimit.mockResolvedValue([]);

		await ExceptionService.getActiveException('user-1', 'RUST', 3);

		expect(mockFindFirstSeason).toHaveBeenCalledTimes(1);
		expect(mockSelect).toHaveBeenCalledTimes(1);
		expect(mockLimit).toHaveBeenCalledWith(1);
	});

	it('returns null for empty array result', async () => {
		mockFindFirstSeason.mockResolvedValue({ id: 'season-1', isActive: true });
		mockLimit.mockResolvedValue([]);

		const result = await ExceptionService.getActiveException('user-1', 'GAME_DEV', 5);
		expect(result).toBeNull();
	});
});
