import { env } from '$env/dynamic/private';
import { requireAdminOrAmbassador } from '$lib/server/auth/guard';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	requireAdminOrAmbassador(event);
	const cert = env.QZ_CERTIFICATE?.replace(/\\n/g, '\n');
	if (!cert) {
		return new Response('QZ certificate not configured', { status: 500 });
	}
	return new Response(cert, {
		headers: { 'Content-Type': 'text/plain' }
	});
};
