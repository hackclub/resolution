import { redirect, error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ parent }) => {
	const { user } = await parent();

	if (!user.isAdmin) {
		throw error(403, 'Access denied - admin only');
	}

	return { user };
};
