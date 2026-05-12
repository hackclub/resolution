import type { RequestEvent, ActionFailure } from '@sveltejs/kit';
import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { ambassadorPathway } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export function requireAuth(event: RequestEvent) {
  if (!event.locals.user || !event.locals.session) {
    throw error(401, 'Unauthorized');
  }
  return {
    user: event.locals.user,
    session: event.locals.session
  };
}

export function getUser(event: RequestEvent) {
  return event.locals.user;
}

// Require admin OR at least one ambassador pathway assignment. Throws if not.
export async function requireAdminOrAmbassador(event: RequestEvent) {
  const { user, session } = requireAuth(event);
  if (user.isAdmin) return { user, session };
  const rows = await db
    .select({ userId: ambassadorPathway.userId })
    .from(ambassadorPathway)
    .where(eq(ambassadorPathway.userId, user.id))
    .limit(1);
  if (rows.length === 0) {
    throw error(403, 'Access denied - admin or ambassador only');
  }
  return { user, session };
}

// Form-action variant: returns { user, session } on success or a fail() result the action
// can return directly. Usage:
//   const guard = await guardAdminOrAmbassador(locals);
//   if ('failResult' in guard) return guard.failResult;
type GuardSuccess = {
  user: NonNullable<App.Locals['user']>;
  session: NonNullable<App.Locals['session']>;
};
type GuardFailure = { failResult: ActionFailure<{ error: string }> };
export async function guardAdminOrAmbassador(
  locals: App.Locals
): Promise<GuardSuccess | GuardFailure> {
  if (!locals.user || !locals.session) {
    return { failResult: fail(401, { error: 'Not logged in' }) };
  }
  if (locals.user.isAdmin) {
    return { user: locals.user, session: locals.session };
  }
  const rows = await db
    .select({ userId: ambassadorPathway.userId })
    .from(ambassadorPathway)
    .where(eq(ambassadorPathway.userId, locals.user.id))
    .limit(1);
  if (rows.length === 0) {
    return { failResult: fail(403, { error: 'Access denied - admin or ambassador only' }) };
  }
  return { user: locals.user, session: locals.session };
}
