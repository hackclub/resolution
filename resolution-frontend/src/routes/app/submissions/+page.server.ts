import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import Airtable from 'airtable';
import { z } from 'zod';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guard';
import { safeUrl } from '$lib/server/validation';

const emailSchema = z.string().email().max(254);

function sanitizeUrl(v: unknown): string | null {
    if (typeof v !== 'string') return null;
    const result = safeUrl.safeParse(v);
    return result.success ? result.data : null;
}

const SAMPLE_SUBMISSIONS = [
	{
		id: 'rec_sample_pending',
		codeUrl: 'https://github.com/example/pending-project',
		playableUrl: 'https://example.com/play/pending',
		description: 'A pending submission still awaiting reviewer attention.',
		firstName: 'Dev',
		lastName: 'User',
		email: 'dev@example.com',
		githubUsername: 'devuser',
		hackatimeProject: 'pending-project',
		pathway: 'GAME_DEV',
		week: 1,
		screenshotUrl: 'https://placehold.co/640x360?text=Pending',
		hoursSpent: 8,
		submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
		isSubmittedYSWS: false,
		isRejected: false,
		rejectionReason: null,
		fixed: false
	},
	{
		id: 'rec_sample_submitted',
		codeUrl: 'https://github.com/example/shipped-project',
		playableUrl: 'https://example.com/play/shipped',
		description: 'An approved submission that has been forwarded to YSWS.',
		firstName: 'Dev',
		lastName: 'User',
		email: 'dev@example.com',
		githubUsername: 'devuser',
		hackatimeProject: 'shipped-project',
		pathway: 'PYTHON',
		week: 2,
		screenshotUrl: 'https://placehold.co/640x360?text=Submitted',
		hoursSpent: 12,
		submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
		isSubmittedYSWS: true,
		isRejected: false,
		rejectionReason: null,
		fixed: false
	},
	{
		id: 'rec_sample_rejected',
		codeUrl: 'https://github.com/example/rejected-project',
		playableUrl: 'https://example.com/play/rejected',
		description: 'A submission that was rejected and still needs fixes.',
		firstName: 'Dev',
		lastName: 'User',
		email: 'dev@example.com',
		githubUsername: 'devuser',
		hackatimeProject: 'rejected-project',
		pathway: 'RUST',
		week: 3,
		screenshotUrl: 'https://placehold.co/640x360?text=Rejected',
		hoursSpent: 4,
		submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
		isSubmittedYSWS: false,
		isRejected: true,
		rejectionReason: 'Please add more documentation and include a working demo link.',
		fixed: false
	},
	{
		id: 'rec_sample_fixed',
		codeUrl: 'https://github.com/example/fixed-project',
		playableUrl: 'https://example.com/play/fixed',
		description: 'A previously rejected submission that has been fixed.',
		firstName: 'Dev',
		lastName: 'User',
		email: 'dev@example.com',
		githubUsername: 'devuser',
		hackatimeProject: 'fixed-project',
		pathway: 'HARDWARE',
		week: 4,
		screenshotUrl: 'https://placehold.co/640x360?text=Fixed',
		hoursSpent: 15,
		submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
		isSubmittedYSWS: false,
		isRejected: true,
		rejectionReason: 'Originally rejected for missing screenshots — now resolved.',
		fixed: true
	}
];

export const load: PageServerLoad = async (event) => {
    const { user } = requireAuth(event);

    if (dev) {
        return { submissions: SAMPLE_SUBMISSIONS };
    }

    if (!env.AIRTABLE_API_TOKEN || !env.AIRTABLE_BASE_ID || !env.AIRTABLE_YSWS_TABLE_ID) throw error(500, 'Server configuration error');

    const parsedEmail = emailSchema.safeParse(user.email);
    if (!parsedEmail.success) throw error(400, 'Invalid user email');

    try {
        const escaped = parsedEmail.data.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const filterByFormula = `LOWER({Email}) = "${escaped.toLowerCase()}"`;

        const base = new Airtable({ apiKey: env.AIRTABLE_API_TOKEN }).base(env.AIRTABLE_BASE_ID);

        const records = await base(env.AIRTABLE_YSWS_TABLE_ID)
            .select({
                filterByFormula,
                fields: [
                    'Code URL',
                    'Playable URL',
                    'Description',
                    'First Name',
                    'Last Name',
                    'Email',
                    'GitHub Username',
                    'Hackatime Project',
                    'Pathway',
                    'Week',
                    'Screenshot',
                    'Optional - Override Hours Spent',
                    'Rejected',
                    'Reject Reason',
                    'Fixed?',
                    'Automation - Status'
                ]
            })
            .all();
        const submissions = records.map((record) => {
            return {
                id: record.id,
                codeUrl: sanitizeUrl(record.get('Code URL')),
                playableUrl: sanitizeUrl(record.get('Playable URL')),
                description: record.get('Description') as string,
                firstName: record.get('First Name') as string,
                lastName: record.get('Last Name') as string,
                email: record.get('Email') as string,
                githubUsername: record.get('GitHub Username') as string,
                hackatimeProject: record.get('Hackatime Project') as string,
                pathway: record.get('Pathway') as string,
                week: record.get('Week') as number,
                screenshotUrl: sanitizeUrl((record.get('Screenshot') as Array<{ url: string }> | undefined)?.[0]?.url),
                hoursSpent: (record.get('Optional - Override Hours Spent') as number | undefined) ?? null,
                submittedAt: record._rawJson.createdTime as string,
                isSubmittedYSWS: record.get('Automation - Status') === '2–Submitted',
                isRejected: Boolean(record.get('Rejected')),
                rejectionReason: (record.get('Reject Reason') as string | undefined) ?? null,
                fixed: Boolean(record.get('Fixed?'))
            };
        });

        return { submissions };
    } catch (err) {
        console.error('Fetch submissions error:', err);
        throw error(500, 'Failed to fetch submissions');
    }
};
