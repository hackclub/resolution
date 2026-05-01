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
			return {
				from: (...a: unknown[]) => {
					mockFrom(...a);
					return {
						where: (...w: unknown[]) => {
							mockWhere(...w);
							return { limit: (...l: unknown[]) => mockLimit(...l) };
						}
					};
				}
			};
		}
	}
}));

const { ExceptionService } = await import('./exceptionService');
const { submissionClosureException } = await import('../db/schema');

beforeEach(() => {
	vi.clearAllMocks();
});

/**
 * Walk a drizzle SQL/condition node and collect the columns referenced by every
 * `eq(column, ...)`/`gte(column, ...)` operator. We assert against this so that
 * if anyone removes one of the filters from `getActiveException`, the test fails.
 */
function collectReferencedColumns(
	node: unknown,
	out: Set<string> = new Set(),
	seen: WeakSet<object> = new WeakSet()
): Set<string> {
	if (!node || typeof node !== 'object') return out;
	if (seen.has(node as object)) return out;
	seen.add(node as object);
	const n = node as Record<string, unknown>;

	// drizzle Column instances expose `.name` plus column-ish metadata.
	if (typeof n.name === 'string' && (n.columnType || n.dataType)) {
		out.add(n.name as string);
		// don't recurse into a column's `.table` back-reference; that's the
		// full table definition and would re-walk every other column.
		return out;
	}

	for (const key of Object.keys(n)) {
		// avoid drizzle internal back-references that explode the walk.
		if (key === 'table' || key === 'schema') continue;
		const value = n[key];
		if (Array.isArray(value)) {
			for (const item of value) collectReferencedColumns(item, out, seen);
		} else if (value && typeof value === 'object') {
			collectReferencedColumns(value, out, seen);
		}
	}
	return out;
}

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
		const exception = { id: 'exc-1', expiresAt: '2026-06-01' };
		mockFindFirstSeason.mockResolvedValue({ id: 'season-1', isActive: true });
		mockLimit.mockResolvedValue([exception]);

		const result = await ExceptionService.getActiveException('user-1', 'PYTHON', 1);
		expect(result).toEqual(exception);
	});

	it('queries with limit 1', async () => {
		mockFindFirstSeason.mockResolvedValue({ id: 'season-42', isActive: true });
		mockLimit.mockResolvedValue([]);

		await ExceptionService.getActiveException('user-1', 'RUST', 3);

		expect(mockFindFirstSeason).toHaveBeenCalledTimes(1);
		expect(mockSelect).toHaveBeenCalledTimes(1);
		expect(mockLimit).toHaveBeenCalledWith(1);
	});

	it('filters on userId, seasonId, pathway, weekNumber, isActive, and expiresAt', async () => {
		mockFindFirstSeason.mockResolvedValue({ id: 'season-1', isActive: true });
		mockLimit.mockResolvedValue([]);

		await ExceptionService.getActiveException('user-1', 'PYTHON', 1);

		expect(mockWhere).toHaveBeenCalledTimes(1);
		const whereArg = mockWhere.mock.calls[0][0];
		const referenced = collectReferencedColumns(whereArg);

		// Each of these filters is critical to the security/correctness of the
		// service. Removing any of them would silently allow incorrect bypasses.
		const expectedColumns = [
			submissionClosureException.userId.name,
			submissionClosureException.seasonId.name,
			submissionClosureException.pathway.name,
			submissionClosureException.weekNumber.name,
			submissionClosureException.isActive.name,
			submissionClosureException.expiresAt.name
		];

		for (const col of expectedColumns) {
			expect(referenced.has(col), `expected where clause to reference column "${col}"`).toBe(true);
		}
	});

	it('returns null for empty array result', async () => {
		mockFindFirstSeason.mockResolvedValue({ id: 'season-1', isActive: true });
		mockLimit.mockResolvedValue([]);

		const result = await ExceptionService.getActiveException('user-1', 'GAME_DEV', 5);
		expect(result).toBeNull();
	});
});
