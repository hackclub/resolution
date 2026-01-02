import { env } from '$env/dynamic/private';
import Airtable from 'airtable';
import { json } from '@sveltejs/kit';

export async function POST({ request, getClientAddress }) {
    try {
        const { email } = await request.json();
        const ip = getClientAddress();

        if (!email) {
            return json({ error: 'Email is required' }, { status: 400 });
        }

        console.log(`Submitting email: ${email} from IP: ${ip}`);

        const base = new Airtable({ apiKey: env.AIRTABLE_API_TOKEN }).base(env.AIRTABLE_BASE_ID!);

        await base(env.AIRTABLE_TABLE_ID!).create([
            {
                "fields": {
                    "Email": email,
                    "IP-Addres": ip
                }
            }
        ]);

        return json({ success: true });
    } catch (err) {
        console.error('Airtable submission error:', err);
        return json({ error: 'Failed to submit application. Please try again.' }, { status: 500 });
    }
}
