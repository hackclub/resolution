import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks for the env, db, services, and Airtable so we can exercise the
// closed-submissions + exception branch in isolation.
const mockGetActiveException = vi.fn();
const mockSelectChain = vi.fn();
const mockAirtableCreate = vi.fn();
const mockFetch = vi.fn();

vi.mock('$env/dynamic/private', () => ({
	env: {
		AIRTABLE_API_TOKEN: 'tok',
		AIRTABLE_BASE_ID: 'base',
		AIRTABLE_YSWS_TABLE_ID: 'tbl'
	}
}));

vi.mock('$lib/server/auth/guard', () => ({
	requireAuth: (event: any) => {
		if (!event.locals.user) throw new Error('Unauthorized');
		return { user: event.locals.user, session: { id: 'sess-1' } };
	}
}));

vi.mock('$lib/server/services', () => ({
	ExceptionService: {
		getActiveException: (...a: unknown[]) => mockGetActiveException(...a)
	}
}));

// Drizzle db: each call to `.select(...).from(...).where(...).limit(...)` is
// shaped via the chain. We track each invocation in order via mockSelectChain
// so the test can hand back successive results (enrollment, weekContent, ...).
vi.mock('$lib/server/db', () => {
	const builder = () => {
		const chain: any = {
			from: () => chain,
			where: () => chain,
			limit: () => mockSelectChain()
		};
		return chain;
	};
	return {
		db: {
			select: () => builder()
		}
	};
});

// Airtable client mock: the route does
//   new Airtable(...).base(id)(tableId).create([...])
// so we mock the constructor.
vi.mock('airtable', () => {
	const tableFn = () => ({
		create: (...a: unknown[]) => mockAirtableCreate(...a)
	});
	const base = () => tableFn;
	class Airtable {
		base = base;
	}
	return { default: Airtable };
});

// global.fetch is used for the attachment upload step.
globalThis.fetch = ((...args: unknown[]) => mockFetch(...args)) as any;

const { POST } = await import('./+server');

const validFormFields: Record<string, string> = {
	codeUrl: 'https://github.com/u/r',
	playableUrl: 'https://example.com/demo',
	howDidYouHear: 'a friend',
	doingWell: 'good',
	improvements: 'more docs',
	firstName: 'Jane',
	lastName: 'Doe',
	email: 'jane@example.com',
	description: 'project',
	githubUsername: 'janedoe',
	addressLine1: '123 Main St',
	city: 'Springfield',
	stateProvince: 'IL',
	country: 'US',
	zipPostalCode: '62701',
	birthday: '2005-06-15',
	hackatimeProject: 'my-proj',
	hoursSpent: '10',
	pathway: 'PYTHON',
	week: '1'
};

function makePostEvent() {
	const fd = new FormData();
	for (const [k, v] of Object.entries(validFormFields)) fd.append(k, v);
	// Minimal in-memory "screenshot" file.
	const file = new File([new Uint8Array([1, 2, 3])], 'shot.png', { type: 'image/png' });
	fd.append('screenshot', file);

	// We build a lightweight stand-in for the SvelteKit RequestEvent. We can't
	// reliably round-trip FormData through `new Request({ body: fd })` under
	// jsdom, so we expose `formData()` directly.
	return {
		locals: { user: { id: 'user-1' } },
		request: {
			formData: async () => fd
		}
	} as any;
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('POST /api/ships/submit-project — exception branch', () => {
	it('returns 403 when submissions are closed and the user has no exception', async () => {
		mockSelectChain
			.mockResolvedValueOnce([{ userId: 'user-1', pathway: 'PYTHON' }]) // enrollment
			.mockResolvedValueOnce([{ isPublished: true, isSubmissionsOpen: false }]); // week
		mockGetActiveException.mockResolvedValue(null);

		const res = await POST(makePostEvent());
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error).toMatch(/closed/i);
		expect(mockGetActiveException).toHaveBeenCalledWith('user-1', 'PYTHON', 1);
		expect(mockAirtableCreate).not.toHaveBeenCalled();
	});

	it('proceeds to create the submission when an active exception exists', async () => {
		mockSelectChain
			.mockResolvedValueOnce([{ userId: 'user-1', pathway: 'PYTHON' }])
			.mockResolvedValueOnce([{ isPublished: true, isSubmissionsOpen: false }]);
		mockGetActiveException.mockResolvedValue({ id: 'exc-1', expiresAt: '2999-01-01' });
		mockAirtableCreate.mockResolvedValue([{ getId: () => 'rec-1' }]);
		mockFetch.mockResolvedValue({ ok: true, text: async () => '' });

		const res = await POST(makePostEvent());
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ success: true, recordId: 'rec-1' });
		expect(mockGetActiveException).toHaveBeenCalledWith('user-1', 'PYTHON', 1);
		expect(mockAirtableCreate).toHaveBeenCalledTimes(1);
	});

	it('skips the exception lookup entirely when submissions are open', async () => {
		mockSelectChain
			.mockResolvedValueOnce([{ userId: 'user-1', pathway: 'PYTHON' }])
			.mockResolvedValueOnce([{ isPublished: true, isSubmissionsOpen: true }]);
		mockAirtableCreate.mockResolvedValue([{ getId: () => 'rec-2' }]);
		mockFetch.mockResolvedValue({ ok: true, text: async () => '' });

		const res = await POST(makePostEvent());
		expect(res.status).toBe(200);
		expect(mockGetActiveException).not.toHaveBeenCalled();
		expect(mockAirtableCreate).toHaveBeenCalledTimes(1);
	});

	it('returns 403 when the week is not published', async () => {
		mockSelectChain
			.mockResolvedValueOnce([{ userId: 'user-1', pathway: 'PYTHON' }])
			.mockResolvedValueOnce([{ isPublished: false, isSubmissionsOpen: false }]);

		const res = await POST(makePostEvent());
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error).toMatch(/not available/i);
		expect(mockGetActiveException).not.toHaveBeenCalled();
		expect(mockAirtableCreate).not.toHaveBeenCalled();
	});

	it('returns 403 when the user is not enrolled in the pathway', async () => {
		mockSelectChain.mockResolvedValueOnce([]); // no enrollment

		const res = await POST(makePostEvent());
		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.error).toMatch(/not enrolled/i);
		expect(mockGetActiveException).not.toHaveBeenCalled();
		expect(mockAirtableCreate).not.toHaveBeenCalled();
	});
});
