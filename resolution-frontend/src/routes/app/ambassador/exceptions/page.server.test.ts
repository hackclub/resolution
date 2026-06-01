import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks for db query/builder methods used by the actions.
const mockFindFirstSeason = vi.fn();
const mockFindFirstAmbassadorPathway = vi.fn();
const mockFindFirstUserPathway = vi.fn();
const mockFindFirstException = vi.fn();
const mockInsertValues = vi.fn();
const mockUpdateWhere = vi.fn();
const mockDeleteWhere = vi.fn();

vi.mock('$lib/server/db', () => ({
	db: {
		query: {
			programSeason: { findFirst: (...a: unknown[]) => mockFindFirstSeason(...a) },
			ambassadorPathway: {
				findFirst: (...a: unknown[]) => mockFindFirstAmbassadorPathway(...a)
			},
			userPathway: { findFirst: (...a: unknown[]) => mockFindFirstUserPathway(...a) },
			submissionClosureException: {
				findFirst: (...a: unknown[]) => mockFindFirstException(...a)
			}
		},
		insert: () => ({
			values: (...a: unknown[]) => mockInsertValues(...a)
		}),
		update: () => ({
			set: () => ({
				where: (...a: unknown[]) => mockUpdateWhere(...a)
			})
		}),
		delete: () => ({
			where: (...a: unknown[]) => mockDeleteWhere(...a)
		})
	}
}));

const { actions } = await import('./+page.server');

beforeEach(() => {
	vi.clearAllMocks();
	mockInsertValues.mockResolvedValue(undefined);
	mockUpdateWhere.mockResolvedValue(undefined);
	mockDeleteWhere.mockResolvedValue(undefined);
});

function makeRequest(fields: Record<string, string>): Request {
	const fd = new FormData();
	for (const [k, v] of Object.entries(fields)) fd.append(k, v);
	return new Request('http://localhost/test', { method: 'POST', body: fd });
}

const ambassadorUser = { id: 'amb-1', isAdmin: false };
const adminUser = { id: 'admin-1', isAdmin: true };
const session = { id: 'sess-1' };

function futureDateStr(daysAhead = 7): string {
	const d = new Date();
	d.setDate(d.getDate() + daysAhead);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function pastDateStr(daysAgo = 1): string {
	const d = new Date();
	d.setDate(d.getDate() - daysAgo);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// createException
// ---------------------------------------------------------------------------

describe('createException action', () => {
	it('rejects unauthenticated callers', async () => {
		const result = await actions.createException!({
			request: makeRequest({}),
			locals: { user: null, session: null }
		} as any);
		expect((result as any).status).toBe(401);
	});

	it('rejects missing fields', async () => {
		const result = await actions.createException!({
			request: makeRequest({ userId: 'u1', pathway: 'PYTHON', weekNumber: '1' }),
			locals: { user: ambassadorUser, session }
		} as any);
		expect((result as any).status).toBe(400);
		expect((result as any).data.error).toMatch(/required/i);
	});

	it('rejects invalid pathway', async () => {
		const result = await actions.createException!({
			request: makeRequest({
				userId: 'u1',
				pathway: 'NOT_A_PATHWAY',
				weekNumber: '1',
				reason: 'r',
				expiresAt: futureDateStr()
			}),
			locals: { user: ambassadorUser, session }
		} as any);
		expect((result as any).status).toBe(400);
		expect((result as any).data.error).toMatch(/invalid pathway/i);
	});

	it('rejects past expiration dates', async () => {
		const result = await actions.createException!({
			request: makeRequest({
				userId: 'u1',
				pathway: 'PYTHON',
				weekNumber: '1',
				reason: 'r',
				expiresAt: pastDateStr()
			}),
			locals: { user: ambassadorUser, session }
		} as any);
		expect((result as any).status).toBe(400);
		expect((result as any).data.error).toMatch(/future/i);
	});

	it('rejects when ambassador is not assigned to the pathway', async () => {
		mockFindFirstSeason.mockResolvedValue({ id: 'season-1', totalWeeks: 8 });
		mockFindFirstAmbassadorPathway.mockResolvedValue(undefined);

		const result = await actions.createException!({
			request: makeRequest({
				userId: 'u1',
				pathway: 'PYTHON',
				weekNumber: '1',
				reason: 'r',
				expiresAt: futureDateStr()
			}),
			locals: { user: ambassadorUser, session }
		} as any);
		expect((result as any).status).toBe(403);
		expect(mockInsertValues).not.toHaveBeenCalled();
	});

	it('rejects when target user is not enrolled in the pathway', async () => {
		mockFindFirstSeason.mockResolvedValue({ id: 'season-1', totalWeeks: 8 });
		mockFindFirstAmbassadorPathway.mockResolvedValue({ pathway: 'PYTHON' });
		mockFindFirstUserPathway.mockResolvedValue(undefined);

		const result = await actions.createException!({
			request: makeRequest({
				userId: 'u1',
				pathway: 'PYTHON',
				weekNumber: '1',
				reason: 'r',
				expiresAt: futureDateStr()
			}),
			locals: { user: ambassadorUser, session }
		} as any);
		expect((result as any).status).toBe(400);
		expect((result as any).data.error).toMatch(/not enrolled/i);
		expect(mockInsertValues).not.toHaveBeenCalled();
	});

	it('inserts an exception on the happy path for an assigned ambassador', async () => {
		mockFindFirstSeason.mockResolvedValue({ id: 'season-1', totalWeeks: 8 });
		mockFindFirstAmbassadorPathway.mockResolvedValue({ pathway: 'PYTHON' });
		mockFindFirstUserPathway.mockResolvedValue({ userId: 'u1', pathway: 'PYTHON' });

		const expires = futureDateStr();
		const result = await actions.createException!({
			request: makeRequest({
				userId: 'u1',
				pathway: 'PYTHON',
				weekNumber: '2',
				reason: 'travel',
				expiresAt: expires
			}),
			locals: { user: ambassadorUser, session }
		} as any);

		expect(result).toEqual({ success: true });
		expect(mockInsertValues).toHaveBeenCalledTimes(1);
		const inserted = mockInsertValues.mock.calls[0][0];
		expect(inserted).toMatchObject({
			userId: 'u1',
			seasonId: 'season-1',
			pathway: 'PYTHON',
			weekNumber: 2,
			reason: 'travel',
			expiresAt: expires,
			createdBy: 'amb-1'
		});
	});

	it('admins bypass the ambassador assignment check', async () => {
		mockFindFirstSeason.mockResolvedValue({ id: 'season-1', totalWeeks: 8 });
		mockFindFirstUserPathway.mockResolvedValue({ userId: 'u1', pathway: 'RUST' });

		const result = await actions.createException!({
			request: makeRequest({
				userId: 'u1',
				pathway: 'RUST',
				weekNumber: '1',
				reason: 'reason',
				expiresAt: futureDateStr()
			}),
			locals: { user: adminUser, session }
		} as any);

		expect(result).toEqual({ success: true });
		expect(mockFindFirstAmbassadorPathway).not.toHaveBeenCalled();
		expect(mockInsertValues).toHaveBeenCalledTimes(1);
	});

	it('maps Postgres unique-violation errors to a friendly message', async () => {
		mockFindFirstSeason.mockResolvedValue({ id: 'season-1', totalWeeks: 8 });
		mockFindFirstAmbassadorPathway.mockResolvedValue({ pathway: 'PYTHON' });
		mockFindFirstUserPathway.mockResolvedValue({ userId: 'u1', pathway: 'PYTHON' });
		mockInsertValues.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: '23505' }));

		const result = await actions.createException!({
			request: makeRequest({
				userId: 'u1',
				pathway: 'PYTHON',
				weekNumber: '1',
				reason: 'r',
				expiresAt: futureDateStr()
			}),
			locals: { user: ambassadorUser, session }
		} as any);

		expect((result as any).status).toBe(400);
		expect((result as any).data.error).toMatch(/already exists/i);
	});

	it('returns 500 (not "already exists") for non-unique-violation insert errors', async () => {
		mockFindFirstSeason.mockResolvedValue({ id: 'season-1', totalWeeks: 8 });
		mockFindFirstAmbassadorPathway.mockResolvedValue({ pathway: 'PYTHON' });
		mockFindFirstUserPathway.mockResolvedValue({ userId: 'u1', pathway: 'PYTHON' });
		mockInsertValues.mockRejectedValueOnce(
			Object.assign(new Error('fk fail'), { code: '23503' })
		);

		const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const result = await actions.createException!({
			request: makeRequest({
				userId: 'u1',
				pathway: 'PYTHON',
				weekNumber: '1',
				reason: 'r',
				expiresAt: futureDateStr()
			}),
			locals: { user: ambassadorUser, session }
		} as any);
		errSpy.mockRestore();

		expect((result as any).status).toBe(500);
		expect((result as any).data.error).not.toMatch(/already exists/i);
	});
});

// ---------------------------------------------------------------------------
// toggleException
// ---------------------------------------------------------------------------

describe('toggleException action', () => {
	it('rejects unauthenticated callers', async () => {
		const result = await actions.toggleException!({
			request: makeRequest({ exceptionId: 'e1' }),
			locals: { user: null, session: null }
		} as any);
		expect((result as any).status).toBe(401);
	});

	it('returns 404 for missing exception', async () => {
		mockFindFirstException.mockResolvedValue(undefined);
		const result = await actions.toggleException!({
			request: makeRequest({ exceptionId: 'e1' }),
			locals: { user: ambassadorUser, session }
		} as any);
		expect((result as any).status).toBe(404);
	});

	it('rejects when ambassador is not assigned to the exception pathway', async () => {
		mockFindFirstException.mockResolvedValue({
			id: 'e1',
			pathway: 'PYTHON',
			isActive: true,
			expiresAt: futureDateStr()
		});
		mockFindFirstAmbassadorPathway.mockResolvedValue(undefined);

		const result = await actions.toggleException!({
			request: makeRequest({ exceptionId: 'e1' }),
			locals: { user: ambassadorUser, session }
		} as any);
		expect((result as any).status).toBe(403);
		expect(mockUpdateWhere).not.toHaveBeenCalled();
	});

	it('toggles isActive from true to false on happy path', async () => {
		mockFindFirstException.mockResolvedValue({
			id: 'e1',
			pathway: 'PYTHON',
			isActive: true,
			expiresAt: futureDateStr()
		});
		mockFindFirstAmbassadorPathway.mockResolvedValue({ pathway: 'PYTHON' });

		const result = await actions.toggleException!({
			request: makeRequest({ exceptionId: 'e1' }),
			locals: { user: ambassadorUser, session }
		} as any);
		expect(result).toEqual({ success: true });
		expect(mockUpdateWhere).toHaveBeenCalledTimes(1);
	});

	it('refuses to re-activate an expired exception', async () => {
		mockFindFirstException.mockResolvedValue({
			id: 'e1',
			pathway: 'PYTHON',
			isActive: false,
			expiresAt: pastDateStr()
		});
		mockFindFirstAmbassadorPathway.mockResolvedValue({ pathway: 'PYTHON' });

		const result = await actions.toggleException!({
			request: makeRequest({ exceptionId: 'e1' }),
			locals: { user: ambassadorUser, session }
		} as any);
		expect((result as any).status).toBe(400);
		expect((result as any).data.error).toMatch(/expired/i);
		expect(mockUpdateWhere).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// deleteException
// ---------------------------------------------------------------------------

describe('deleteException action', () => {
	it('rejects unauthenticated callers', async () => {
		const result = await actions.deleteException!({
			request: makeRequest({ exceptionId: 'e1' }),
			locals: { user: null, session: null }
		} as any);
		expect((result as any).status).toBe(401);
	});

	it('returns 404 for missing exception', async () => {
		mockFindFirstException.mockResolvedValue(undefined);
		const result = await actions.deleteException!({
			request: makeRequest({ exceptionId: 'e1' }),
			locals: { user: ambassadorUser, session }
		} as any);
		expect((result as any).status).toBe(404);
		expect(mockDeleteWhere).not.toHaveBeenCalled();
	});

	it('rejects when ambassador is not assigned to the exception pathway', async () => {
		mockFindFirstException.mockResolvedValue({ id: 'e1', pathway: 'PYTHON' });
		mockFindFirstAmbassadorPathway.mockResolvedValue(undefined);

		const result = await actions.deleteException!({
			request: makeRequest({ exceptionId: 'e1' }),
			locals: { user: ambassadorUser, session }
		} as any);
		expect((result as any).status).toBe(403);
		expect(mockDeleteWhere).not.toHaveBeenCalled();
	});

	it('deletes on happy path', async () => {
		mockFindFirstException.mockResolvedValue({ id: 'e1', pathway: 'PYTHON' });
		mockFindFirstAmbassadorPathway.mockResolvedValue({ pathway: 'PYTHON' });

		const result = await actions.deleteException!({
			request: makeRequest({ exceptionId: 'e1' }),
			locals: { user: ambassadorUser, session }
		} as any);
		expect(result).toEqual({ success: true });
		expect(mockDeleteWhere).toHaveBeenCalledTimes(1);
	});

	it('admins bypass the ambassador assignment check', async () => {
		mockFindFirstException.mockResolvedValue({ id: 'e1', pathway: 'RUST' });

		const result = await actions.deleteException!({
			request: makeRequest({ exceptionId: 'e1' }),
			locals: { user: adminUser, session }
		} as any);
		expect(result).toEqual({ success: true });
		expect(mockFindFirstAmbassadorPathway).not.toHaveBeenCalled();
		expect(mockDeleteWhere).toHaveBeenCalledTimes(1);
	});
});
