import { redirect } from '@sveltejs/kit';
import { hackClubAuth, lucia } from '$lib/server/auth';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const STAGING_USER_ID = 'staging-admin-123';

export const GET: RequestHandler = async ({ locals, cookies }) => {
  // If user already has a valid session, skip OAuth and go straight to app
  if (locals.user && locals.session) {
    throw redirect(302, '/app');
  }

  if (env.STAGING_MODE === 'true') {
    // Bypass OAuth: upsert a staging admin user and create a session
    const existing = await db.query.user.findFirst({
      where: eq(user.id, STAGING_USER_ID)
    });

    if (!existing) {
      await db.insert(user).values({
        id: STAGING_USER_ID,
        email: 'admin@staging.local',
        hackClubId: 'staging-hack-club-id',
        firstName: 'Staging',
        lastName: 'Admin',
        isAdmin: true
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
