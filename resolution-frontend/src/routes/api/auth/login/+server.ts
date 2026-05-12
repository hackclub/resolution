import { redirect, error } from '@sveltejs/kit';
import { hackClubAuth, lucia } from '$lib/server/auth';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const STAGING_USER_ID = 'staging-user-123';

export const GET: RequestHandler = async ({ locals, cookies }) => {
  if (locals.user && locals.session) {
    throw redirect(302, '/app');
  }

  if (env.STAGING_MODE === 'true') {
    if (env.NODE_ENV === 'production') {
      console.error('STAGING_MODE=true is not allowed when NODE_ENV=production — refusing login bypass');
      throw error(500, 'STAGING_MODE is not permitted in production');
    }
    const existing = await db.query.user.findFirst({
      where: eq(user.id, STAGING_USER_ID)
    });

    if (!existing) {
      await db.insert(user).values({
        id: STAGING_USER_ID,
        email: 'user@staging.local',
        hackClubId: 'staging-hack-club-id',
        firstName: 'Staging',
        lastName: 'User',
        isAdmin: false
      });
    }

    const session = await lucia.createSession(STAGING_USER_ID, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies.set(sessionCookie.name, sessionCookie.value, {
      path: '.',
      ...sessionCookie.attributes
    });

    throw redirect(302, '/app');
  }

  const authorizationUri = hackClubAuth.authorizeURL({
    redirect_uri: `${env.BASE_URL}/api/auth/callback`,
    scope: 'openid profile email name slack_id verification_status'
  });

  throw redirect(302, authorizationUri);
};
