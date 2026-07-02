import { lucia } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';
import { ensureSeasonFromEnv } from '$lib/server/season';
import { serializeTimings } from '$lib/server/timing';

// Sync season from env on startup
ensureSeasonFromEnv().catch(console.error);

// Module-load time: lets us flag the first request served by a fresh instance
// (i.e. a cold start) and report how long ago this instance booted.
const instanceBootedAt = Date.now();
let requestsServed = 0;

export const handle: Handle = async ({ event, resolve }) => {
  const handlerStart = performance.now();
  const isColdStart = requestsServed === 0;
  requestsServed++;

  event.locals.timings = [];

  const sessionId = event.cookies.get(lucia.sessionCookieName);

  const finalize = (response: Response): Response => {
    const marks = [...(event.locals.timings ?? [])];
    marks.push({ name: 'handler', dur: performance.now() - handlerStart, desc: 'total in hooks' });
    if (isColdStart) {
      marks.push({ name: 'cold', dur: Date.now() - instanceBootedAt, desc: 'first request on instance' });
    }
    response.headers.set('Server-Timing', serializeTimings(marks));
    // Cloudflare strips our Server-Timing header (replaces it with cf* metrics),
    // so also log it — visible in Vercel runtime logs, bypassing CF entirely.
    console.log(
      `[timing] ${event.request.method} ${event.url.pathname}` +
        (isColdStart ? ' COLD' : '') +
        ' | ' +
        marks.map((m) => `${m.name}=${m.dur.toFixed(1)}ms`).join(' ')
    );
    return response;
  };

  if (!sessionId) {
    event.locals.user = null;
    event.locals.session = null;
    return finalize(await resolve(event));
  }

  const authStart = performance.now();
  const { session, user } = await lucia.validateSession(sessionId);
  event.locals.timings.push({
    name: 'auth',
    dur: performance.now() - authStart,
    desc: 'validateSession'
  });
  
  if (session && session.fresh) {
    const sessionCookie = lucia.createSessionCookie(session.id);
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes
    });
  }
  
  if (!session) {
    const sessionCookie = lucia.createBlankSessionCookie();
    event.cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes
    });
  }

  event.locals.user = user;
  event.locals.session = session;
  
  return finalize(await resolve(event));
};
