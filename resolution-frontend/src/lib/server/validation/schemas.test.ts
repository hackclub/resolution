import { describe, it, expect } from 'vitest';
import {
	createShipSchema,
	markShippedSchema,
	updateShipStatusSchema,
	enrollSeasonSchema,
	projectSubmissionSchema
} from './schemas';

describe('createShipSchema', () => {
	const valid = { seasonId: 's1', weekNumber: 1, goalText: 'Build an app' };

	it('accepts valid input', () => {
		expect(createShipSchema.safeParse(valid).success).toBe(true);
	});

	it('rejects empty seasonId', () => {
		expect(createShipSchema.safeParse({ ...valid, seasonId: '' }).success).toBe(false);
	});

	it('rejects weekNumber < 1', () => {
		expect(createShipSchema.safeParse({ ...valid, weekNumber: 0 }).success).toBe(false);
	});

	it('rejects weekNumber > 52', () => {
		expect(createShipSchema.safeParse({ ...valid, weekNumber: 53 }).success).toBe(false);
	});

	it('rejects non-integer weekNumber', () => {
		expect(createShipSchema.safeParse({ ...valid, weekNumber: 1.5 }).success).toBe(false);
	});

	it('rejects goalText shorter than 3 chars', () => {
		expect(createShipSchema.safeParse({ ...valid, goalText: 'ab' }).success).toBe(false);
	});

	it('rejects goalText longer than 500 chars', () => {
		expect(createShipSchema.safeParse({ ...valid, goalText: 'x'.repeat(501) }).success).toBe(false);
	});

	it('accepts optional workshopId', () => {
		const result = createShipSchema.safeParse({ ...valid, workshopId: 'w1' });
		expect(result.success).toBe(true);
	});
});

describe('markShippedSchema', () => {
	const valid = { shipId: 'ship1', proofUrl: 'https://example.com/proof.png' };

	it('accepts valid input', () => {
		expect(markShippedSchema.safeParse(valid).success).toBe(true);
	});

	it('rejects empty shipId', () => {
		expect(markShippedSchema.safeParse({ ...valid, shipId: '' }).success).toBe(false);
	});

	it('rejects invalid URL', () => {
		expect(markShippedSchema.safeParse({ ...valid, proofUrl: 'not-a-url' }).success).toBe(false);
	});

	it('rejects URL exceeding 2000 chars', () => {
		const longUrl = 'https://example.com/' + 'a'.repeat(2000);
		expect(markShippedSchema.safeParse({ ...valid, proofUrl: longUrl }).success).toBe(false);
	});

	it('accepts optional notes', () => {
		const result = markShippedSchema.safeParse({ ...valid, notes: 'Great work!' });
		expect(result.success).toBe(true);
	});

	it('rejects notes exceeding 1000 chars', () => {
		const result = markShippedSchema.safeParse({ ...valid, notes: 'x'.repeat(1001) });
		expect(result.success).toBe(false);
	});
});

describe('updateShipStatusSchema', () => {
	it('accepts valid status values', () => {
		for (const status of ['PLANNED', 'IN_PROGRESS', 'SHIPPED', 'MISSED']) {
			expect(updateShipStatusSchema.safeParse({ shipId: 's1', status }).success).toBe(true);
		}
	});

	it('rejects invalid status', () => {
		expect(updateShipStatusSchema.safeParse({ shipId: 's1', status: 'INVALID' }).success).toBe(false);
	});
});

describe('enrollSeasonSchema', () => {
	it('accepts valid slug', () => {
		expect(enrollSeasonSchema.safeParse({ seasonSlug: 'summer-2025' }).success).toBe(true);
	});

	it('rejects empty slug', () => {
		expect(enrollSeasonSchema.safeParse({ seasonSlug: '' }).success).toBe(false);
	});

	it('rejects slug with uppercase letters', () => {
		expect(enrollSeasonSchema.safeParse({ seasonSlug: 'Summer2025' }).success).toBe(false);
	});

	it('rejects slug with special characters', () => {
		expect(enrollSeasonSchema.safeParse({ seasonSlug: 'summer_2025' }).success).toBe(false);
	});

	it('rejects slug exceeding 50 chars', () => {
		expect(enrollSeasonSchema.safeParse({ seasonSlug: 'a'.repeat(51) }).success).toBe(false);
	});
});

describe('projectSubmissionSchema', () => {
	const valid = {
		codeUrl: 'https://github.com/user/repo',
		playableUrl: 'https://example.com/demo',
		howDidYouHear: 'A friend told me',
		doingWell: 'Great progress',
		improvements: 'More docs',
		firstName: 'Jane',
		lastName: 'Doe',
		email: 'Jane@Example.COM',
		description: 'My awesome project',
		addressLine1: '123 Main St',
		city: 'Springfield',
		stateProvince: 'IL',
		country: 'US',
		zipPostalCode: '62701',
		birthday: '2005-06-15',
		hackatimeProject: 'my-project',
		hoursSpent: '10.5',
		pathway: 'PYTHON',
		week: 1
	};

	it('accepts valid input', () => {
		const result = projectSubmissionSchema.safeParse(valid);
		expect(result.success).toBe(true);
	});

	// Email normalization
	it('lowercases email', () => {
		const result = projectSubmissionSchema.safeParse({ ...valid, email: 'Jane@Example.COM' });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.email).toBe('jane@example.com');
		}
	});

	it('rejects email with leading/trailing spaces', () => {
		expect(projectSubmissionSchema.safeParse({ ...valid, email: '  jane@example.com  ' }).success).toBe(false);
	});

	it('rejects invalid email', () => {
		expect(projectSubmissionSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
	});

	it('rejects email exceeding 254 chars', () => {
		const longEmail = 'a'.repeat(243) + '@' + 'b'.repeat(5) + '.' + 'c'.repeat(5);
		expect(longEmail.length).toBeGreaterThan(254);
		expect(projectSubmissionSchema.safeParse({ ...valid, email: longEmail }).success).toBe(false);
	});

	// URL validation
	it('rejects invalid codeUrl', () => {
		expect(projectSubmissionSchema.safeParse({ ...valid, codeUrl: 'not-a-url' }).success).toBe(false);
	});

	it('rejects invalid playableUrl', () => {
		expect(projectSubmissionSchema.safeParse({ ...valid, playableUrl: 'not-a-url' }).success).toBe(false);
	});

	it('rejects javascript: protocol in codeUrl', () => {
		expect(projectSubmissionSchema.safeParse({ ...valid, codeUrl: 'javascript:alert(1)' }).success).toBe(false);
	});

	it('rejects javascript: protocol in playableUrl', () => {
		expect(projectSubmissionSchema.safeParse({ ...valid, playableUrl: 'javascript:alert(1)' }).success).toBe(false);
	});

	it('rejects data: protocol in codeUrl', () => {
		expect(projectSubmissionSchema.safeParse({ ...valid, codeUrl: 'data:text/html,<script>alert(1)</script>' }).success).toBe(false);
	});

	it('rejects codeUrl exceeding 2000 chars', () => {
		const longUrl = 'https://example.com/' + 'a'.repeat(2000);
		expect(projectSubmissionSchema.safeParse({ ...valid, codeUrl: longUrl }).success).toBe(false);
	});

	it('rejects playableUrl exceeding 2000 chars', () => {
		const longUrl = 'https://example.com/' + 'a'.repeat(2000);
		expect(projectSubmissionSchema.safeParse({ ...valid, playableUrl: longUrl }).success).toBe(false);
	});

	// Birthday date format
	it('accepts valid YYYY-MM-DD birthday', () => {
		expect(projectSubmissionSchema.safeParse({ ...valid, birthday: '2000-01-31' }).success).toBe(true);
	});

	it('rejects birthday in wrong format (MM/DD/YYYY)', () => {
		expect(projectSubmissionSchema.safeParse({ ...valid, birthday: '06/15/2005' }).success).toBe(false);
	});

	it('rejects birthday in wrong format (DD-MM-YYYY)', () => {
		expect(projectSubmissionSchema.safeParse({ ...valid, birthday: '15-06-2005' }).success).toBe(false);
	});

	it('rejects empty birthday', () => {
		expect(projectSubmissionSchema.safeParse({ ...valid, birthday: '' }).success).toBe(false);
	});

	// Week boundaries
	it('rejects week < 1', () => {
		expect(projectSubmissionSchema.safeParse({ ...valid, week: 0 }).success).toBe(false);
	});

	it('rejects week > 8', () => {
		expect(projectSubmissionSchema.safeParse({ ...valid, week: 9 }).success).toBe(false);
	});

	it('rejects non-integer week', () => {
		expect(projectSubmissionSchema.safeParse({ ...valid, week: 1.5 }).success).toBe(false);
	});

	it('accepts week at boundaries (1 and 8)', () => {
		expect(projectSubmissionSchema.safeParse({ ...valid, week: 1 }).success).toBe(true);
		expect(projectSubmissionSchema.safeParse({ ...valid, week: 8 }).success).toBe(true);
	});

	// Required text fields
	it.each([
		'firstName',
		'lastName',
		'description',
		'addressLine1',
		'city',
		'stateProvince',
		'country',
		'zipPostalCode',
		'hackatimeProject',
		'pathway'
	])('rejects empty %s', (field) => {
		expect(projectSubmissionSchema.safeParse({ ...valid, [field]: '' }).success).toBe(false);
	});

	// Max length boundaries
	it('rejects firstName exceeding 100 chars', () => {
		expect(projectSubmissionSchema.safeParse({ ...valid, firstName: 'a'.repeat(101) }).success).toBe(false);
	});

	it('rejects description exceeding 2000 chars', () => {
		expect(projectSubmissionSchema.safeParse({ ...valid, description: 'a'.repeat(2001) }).success).toBe(false);
	});

	it('rejects howDidYouHear exceeding 500 chars', () => {
		expect(projectSubmissionSchema.safeParse({ ...valid, howDidYouHear: 'a'.repeat(501) }).success).toBe(false);
	});

	it('rejects doingWell exceeding 1000 chars', () => {
		expect(projectSubmissionSchema.safeParse({ ...valid, doingWell: 'a'.repeat(1001) }).success).toBe(false);
	});

	it('rejects zipPostalCode exceeding 20 chars', () => {
		expect(projectSubmissionSchema.safeParse({ ...valid, zipPostalCode: 'a'.repeat(21) }).success).toBe(false);
	});

	// Optional addressLine2
	it('defaults addressLine2 to empty string when omitted', () => {
		const { addressLine2, ...withoutLine2 } = valid as typeof valid & { addressLine2?: string };
		const result = projectSubmissionSchema.safeParse(withoutLine2);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.addressLine2).toBe('');
		}
	});

	it('accepts addressLine2 when provided', () => {
		const result = projectSubmissionSchema.safeParse({ ...valid, addressLine2: 'Apt 4B' });
		expect(result.success).toBe(true);
	});

	it('rejects addressLine2 exceeding 200 chars', () => {
		expect(projectSubmissionSchema.safeParse({ ...valid, addressLine2: 'a'.repeat(201) }).success).toBe(false);
	});
});


