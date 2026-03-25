import { env } from '$env/dynamic/private';
import Airtable, { type FieldSet } from 'airtable';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard';
import { projectSubmissionSchema } from '$lib/server/validation';
import { ZodError } from 'zod';
import { db } from '$lib/server/db';
import { userPathway, pathwayWeekContent } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { type PathwayId } from '$lib/pathways';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB (Airtable upload limit)
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export const POST: RequestHandler = async (event) => {
	const { user } = requireAuth(event);

	if (!env.AIRTABLE_API_TOKEN || !env.AIRTABLE_BASE_ID || !env.AIRTABLE_YSWS_TABLE_ID) {
		console.error('Missing Airtable YSWS configuration');
		return json({ error: 'Server configuration error' }, { status: 500 });
	}

	try {
		const formData = await event.request.formData();

		const screenshotFile = formData.get('screenshot') as File | null;
		if (!screenshotFile || screenshotFile.size === 0) {
			return json({ error: 'Screenshot is required' }, { status: 400 });
		}

		if (screenshotFile.size > MAX_FILE_SIZE) {
			return json({ error: 'Screenshot must be under 5MB' }, { status: 400 });
		}

		if (!ALLOWED_IMAGE_TYPES.includes(screenshotFile.type)) {
			return json({ error: 'Screenshot must be a PNG, JPEG, GIF, or WebP image' }, { status: 400 });
		}

		const textFields: Record<string, string> = {};
		for (const [key, value] of formData.entries()) {
			if (key !== 'screenshot' && typeof value === 'string') {
				textFields[key] = value;
			}
		}

		const parsed = projectSubmissionSchema.parse({
			...textFields,
			week: parseInt(textFields.week, 10)
		});

		const [enrollment] = await db
			.select()
			.from(userPathway)
			.where(and(eq(userPathway.userId, user.id), eq(userPathway.pathway, parsed.pathway as PathwayId)))
			.limit(1);

		if (!enrollment) {
			return json({ error: 'You are not enrolled in this pathway' }, { status: 403 });
		}

		const [weekContent] = await db
			.select({ isPublished: pathwayWeekContent.isPublished })
			.from(pathwayWeekContent)
			.where(and(
				eq(pathwayWeekContent.pathway, parsed.pathway as PathwayId),
				eq(pathwayWeekContent.weekNumber, parsed.week)
			))
			.limit(1);

		if (!weekContent?.isPublished) {
			return json({ error: 'This week is not available for submissions' }, { status: 403 });
		}

		const base = new Airtable({ apiKey: env.AIRTABLE_API_TOKEN }).base(env.AIRTABLE_BASE_ID);

		// Step 1: Create the record without the screenshot
		const airtableFields: FieldSet = {
			'Code URL': parsed.codeUrl,
			'Playable URL': parsed.playableUrl,
			'How did you hear about this?': parsed.howDidYouHear,
			'What are we doing well?': parsed.doingWell,
			'How can we improve?': parsed.improvements,
			'First Name': parsed.firstName,
			'Last Name': parsed.lastName,
			'Email': parsed.email,
			'Description': parsed.description,
			'GitHub Username': parsed.githubUsername,
			'Address (Line 1)': parsed.addressLine1,
			'Address (Line 2)': parsed.addressLine2 || '',
			'City': parsed.city,
			'State / Province': parsed.stateProvince,
			'Country': parsed.country,
			'ZIP / Postal Code': parsed.zipPostalCode,
			'Birthday': parsed.birthday,
			'Hackatime Project': parsed.hackatimeProject,
			'Optional - Override Hours Spent': parsed.hoursSpent,
			'Pathway': parsed.pathway,
			'Week': parsed.week
		};

		const records = await base(env.AIRTABLE_YSWS_TABLE_ID).create([
			{ fields: airtableFields }
		]);

		const recordId = records[0].getId();

		// Step 2: Upload the screenshot attachment to the created record
		const arrayBuffer = await screenshotFile.arrayBuffer();
		const base64 = Buffer.from(arrayBuffer).toString('base64');

		const uploadResponse = await fetch(
			`https://content.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${recordId}/Screenshot/uploadAttachment`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${env.AIRTABLE_API_TOKEN}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					contentType: screenshotFile.type,
					file: base64,
					filename: screenshotFile.name
				})
			}
		);

		if (!uploadResponse.ok) {
			console.error('Airtable screenshot upload failed:', await uploadResponse.text());
		}

		return json({ success: true, recordId });
	} catch (err) {
		if (err instanceof ZodError) {
			const firstError = err.issues[0]?.message ?? 'Validation failed';
			return json({ error: firstError }, { status: 400 });
		}

		if (err instanceof SyntaxError) {
			return json({ error: 'Invalid request body' }, { status: 400 });
		}

		console.error('Project submission error:', err);
		return json({ error: 'Failed to submit project. Please try again.' }, { status: 500 });
	}
};
