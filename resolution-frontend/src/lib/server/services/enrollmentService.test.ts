import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Pure function tests (extracted logic) ---

function computeStartingWeek(
	startsAt: Date,
	totalWeeks: number,
	refDate: Date = new Date()
): number {
	const msPerWeek = 7 * 24 * 60 * 60 * 1000;
	const diffMs = refDate.getTime() - startsAt.getTime();
	const rawWeek = Math.floor(diffMs / msPerWeek) + 1;
	return Math.min(totalWeeks, Math.max(1, rawWeek));
}

describe('computeStartingWeek', () => {
	const seasonStart = new Date('2025-01-06T00:00:00Z');
	const totalWeeks = 10;

	it('returns 1 on the first day of the season', () => {
		expect(computeStartingWeek(seasonStart, totalWeeks, new Date('2025-01-06T00:00:00Z'))).toBe(1);
	});

	it('returns 1 within the first week', () => {
		expect(computeStartingWeek(seasonStart, totalWeeks, new Date('2025-01-12T23:59:59Z'))).toBe(1);
	});

	it('returns 2 at the start of the second week', () => {
		expect(computeStartingWeek(seasonStart, totalWeeks, new Date('2025-01-13T00:00:00Z'))).toBe(2);
	});

	it('returns totalWeeks at the end of the season', () => {
		expect(computeStartingWeek(seasonStart, totalWeeks, new Date('2025-03-17T00:00:00Z'))).toBe(totalWeeks);
	});

	it('clamps to totalWeeks when refDate is far past season end', () => {
		expect(computeStartingWeek(seasonStart, totalWeeks, new Date('2026-01-01T00:00:00Z'))).toBe(totalWeeks);
	});

	it('clamps to 1 when refDate is before season start', () => {
		expect(computeStartingWeek(seasonStart, totalWeeks, new Date('2024-12-01T00:00:00Z'))).toBe(1);
	});

	it('returns correct week mid-season', () => {
		// 3 full weeks after start = week 4
		expect(computeStartingWeek(seasonStart, totalWeeks, new Date('2025-01-27T00:00:00Z'))).toBe(4);
	});
});

// --- Integration tests (mocked DB) ---

// Mock the db module before importing the service
const mockFindFirstSeason = vi.fn();
const mockFindFirstEnrollment = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();

vi.mock('../db', () => ({
	db: {
		query: {
			programSeason: { findFirst: (...args: unknown[]) => mockFindFirstSeason(...args) },
			programEnrollment: { findFirst: (...args: unknown[]) => mockFindFirstEnrollment(...args) }
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

// Must import after vi.mock
const { EnrollmentService } = await import('./enrollmentService');

beforeEach(() => {
	vi.clearAllMocks();
});

describe('EnrollmentService.enrollParticipant', () => {
	const fakeSeason = { id: 'season-1', slug: 'summer-2025', startsAt: new Date('2025-01-06'), totalWeeks: 10 };

	it('creates new enrollment when none exists', async () => {
		mockFindFirstSeason.mockResolvedValue(fakeSeason);
		mockFindFirstEnrollment.mockResolvedValue(null);
		const created = { id: 'e1', userId: 'u1', seasonId: 'season-1', role: 'PARTICIPANT', status: 'ACTIVE' };
		mockInsert.mockResolvedValue([created]);

		const result = await EnrollmentService.enrollParticipant('u1', 'summer-2025');
		expect(result).toEqual(created);
	});

	it('reactivates existing dropped enrollment', async () => {
		mockFindFirstSeason.mockResolvedValue(fakeSeason);
		const existing = { id: 'e1', userId: 'u1', status: 'DROPPED' };
		mockFindFirstEnrollment.mockResolvedValue(existing);
		const updated = { ...existing, status: 'ACTIVE' };
		mockUpdate.mockResolvedValue([updated]);

		const result = await EnrollmentService.enrollParticipant('u1', 'summer-2025');
		expect(result).toEqual(updated);
	});

	it('throws when season not found', async () => {
		mockFindFirstSeason.mockResolvedValue(undefined);
		await expect(EnrollmentService.enrollParticipant('u1', 'nonexistent')).rejects.toThrow('Season not found');
	});
});

describe('EnrollmentService.hasRole', () => {
	it('returns true for active enrollment', async () => {
		mockFindFirstEnrollment.mockResolvedValue({ status: 'ACTIVE' });
		const result = await EnrollmentService.hasRole('u1', 's1', 'PARTICIPANT');
		expect(result).toBe(true);
	});

	it('returns false for dropped enrollment', async () => {
		mockFindFirstEnrollment.mockResolvedValue({ status: 'DROPPED' });
		const result = await EnrollmentService.hasRole('u1', 's1', 'PARTICIPANT');
		expect(result).toBe(false);
	});

	it('returns false when no enrollment exists', async () => {
		mockFindFirstEnrollment.mockResolvedValue(null);
		const result = await EnrollmentService.hasRole('u1', 's1', 'PARTICIPANT');
		expect(result).toBe(false);
	});
});

describe('EnrollmentService.dropEnrollment', () => {
	it('updates status to DROPPED', async () => {
		const existing = { id: 'e1', userId: 'u1', status: 'ACTIVE' };
		mockFindFirstEnrollment.mockResolvedValue(existing);
		const updated = { ...existing, status: 'DROPPED' };
		mockUpdate.mockResolvedValue([updated]);

		const result = await EnrollmentService.dropEnrollment('u1', 's1', 'PARTICIPANT');
		expect(result).toEqual(updated);
	});

	it('returns null when enrollment not found', async () => {
		mockFindFirstEnrollment.mockResolvedValue(null);
		const result = await EnrollmentService.dropEnrollment('u1', 's1', 'PARTICIPANT');
		expect(result).toBeNull();
	});
});
