import Airtable from 'airtable';
import { AIRTABLE_API_TOKEN, AIRTABLE_BASE_ID } from '$env/static/private';

if (!AIRTABLE_API_TOKEN) {
    throw new Error('AIRTABLE_API_TOKEN is not defined in .env');
}

if (!AIRTABLE_BASE_ID) {
    throw new Error('AIRTABLE_BASE_ID is not defined in .env');
}

const client = new Airtable({ apiKey: AIRTABLE_API_TOKEN });
export const base = client.base(AIRTABLE_BASE_ID);
