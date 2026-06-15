import { lucia } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';
import { ensureSeasonFromEnv } from '$lib/server/season';
import { seedDevShops } from '$lib/server/devSeed';

// Sync season from env on startup
ensureSeasonFromEnv().catch(console.error);

// Seed pathway shops + a starter item per pathway when running in dev
seedDevShops().catch(console.error);

export const handle: Handle = async ({ event, resolve }) => {
  const sessionId = event.cookies.get(lucia.sessionCookieName);
  
  if (!sessionId) {
    event.locals.user = null;
    event.locals.session = null;
    return resolve(event);
  }

  const { session, user } = await lucia.validateSession(sessionId);
  
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
  
  return resolve(event);
};
