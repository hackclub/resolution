import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockValidateSession = vi.fn();
const mockCreateSessionCookie = vi.fn();
const mockCreateBlankSessionCookie = vi.fn();

vi.mock('$lib/server/auth', () => ({
	lucia: {
		sessionCookieName: 'auth_session',
		validateSession: (...args: unknown[]) => mockValidateSession(...args),
		createSessionCookie: (...args: unknown[]) => mockCreateSessionCookie(...args),
		createBlankSessionCookie: (...args: unknown[]) => mockCreateBlankSessionCookie(...args)
	}
}));

vi.mock('$lib/server/season', () => ({
	ensureSeasonFromEnv: () => Promise.resolve()
}));

const { handle } = await import('./hooks.server');

function createMockEvent() {
	const cookies = new Map<string, string>();
	return {
		cookies: {
			get: (name: string) => cookies.get(name),
			set: (name: string, value: string, _opts?: unknown) => {
				cookies.set(name, value);
			}
		},
		locals: {} as Record<string, unknown>,
		_cookies: cookies
	};
}

const resolve = vi.fn(async (event: unknown) => new Response('OK'));

beforeEach(() => {
	vi.clearAllMocks();
});

describe('hooks.server handle', () => {
	it('sets user and session to null when no session cookie', async () => {
		const event = createMockEvent();
		await handle({ event: event as any, resolve });

		expect(event.locals.user).toBeNull();
		expect(event.locals.session).toBeNull();
		expect(resolve).toHaveBeenCalled();
	});

	it('refreshes cookie for fresh session', async () => {
		const event = createMockEvent();
		event._cookies.set('auth_session', 'session-id-123');

		mockValidateSession.mockResolvedValue({
			session: { id: 'session-id-123', fresh: true },
			user: { id: 'user-1', email: 'test@test.com' }
		});
		mockCreateSessionCookie.mockReturnValue({
			name: 'auth_session',
			value: 'new-session-value',
			attributes: { httpOnly: true }
		});

		await handle({ event: event as any, resolve });

		expect(mockCreateSessionCookie).toHaveBeenCalledWith('session-id-123');
		expect(event._cookies.get('auth_session')).toBe('new-session-value');
		expect(event.locals.user).toEqual({ id: 'user-1', email: 'test@test.com' });
	});

	it('clears cookie when session is invalid', async () => {
		const event = createMockEvent();
		event._cookies.set('auth_session', 'expired-session');

		mockValidateSession.mockResolvedValue({
			session: null,
			user: null
		});
		mockCreateBlankSessionCookie.mockReturnValue({
			name: 'auth_session',
			value: '',
			attributes: { httpOnly: true }
		});

		await handle({ event: event as any, resolve });

		expect(mockCreateBlankSessionCookie).toHaveBeenCalled();
		expect(event._cookies.get('auth_session')).toBe('');
		expect(event.locals.user).toBeNull();
		expect(event.locals.session).toBeNull();
	});

	it('does not refresh cookie for non-fresh valid session', async () => {
		const event = createMockEvent();
		event._cookies.set('auth_session', 'valid-session');

		mockValidateSession.mockResolvedValue({
			session: { id: 'valid-session', fresh: false },
			user: { id: 'user-1' }
		});

		await handle({ event: event as any, resolve });

		expect(mockCreateSessionCookie).not.toHaveBeenCalled();
		expect(mockCreateBlankSessionCookie).not.toHaveBeenCalled();
		expect(event.locals.user).toEqual({ id: 'user-1' });
	});
});
