import { env } from '$env/dynamic/private';
import { createSign } from 'crypto';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const toSign = await request.text();

	const privateKey = env.QZ_PRIVATE_KEY?.replace(/\\n/g, '\n');
	const password = env.QZ_PK_PASSWORD;

	if (!privateKey) {
		return new Response('QZ private key not configured', { status: 500 });
	}

	try {
		const sign = createSign('SHA512');
		sign.update(toSign);
		const signature = sign.sign(
			{ key: privateKey, passphrase: password || '' },
			'base64'
		);
		return new Response(signature, {
			headers: { 'Content-Type': 'text/plain' }
		});
	} catch (e) {
		return new Response('Signing failed', { status: 500 });
	}
};
