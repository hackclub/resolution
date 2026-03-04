import { describe, it, expect } from 'vitest';
import {
	createShipSchema,
	markShippedSchema,
	updateShipStatusSchema,
	enrollSeasonSchema,
	shippingRateSchema
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

describe('shippingRateSchema', () => {
	const validBox = {
		country: 'US',
		street: '123 Main St',
		city: 'Springfield',
		province: 'IL',
		postalCode: '62701',
		weight: 2.5,
		packageType: 'box' as const,
		length: 10,
		width: 5,
		height: 3
	};

	const validEnvelope = {
		country: 'US',
		street: '123 Main St',
		city: 'Springfield',
		province: 'IL',
		weight: 0.5,
		packageType: 'envelope' as const,
		length: 10,
		width: 5
	};

	it('accepts valid box input', () => {
		expect(shippingRateSchema.safeParse(validBox).success).toBe(true);
	});

	it('accepts valid envelope input', () => {
		expect(shippingRateSchema.safeParse(validEnvelope).success).toBe(true);
	});

	it('uppercases country code', () => {
		const result = shippingRateSchema.safeParse({ ...validBox, country: 'us' });
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.country).toBe('US');
		}
	});

	it('rejects country code not exactly 2 chars', () => {
		expect(shippingRateSchema.safeParse({ ...validBox, country: 'USA' }).success).toBe(false);
	});

	it('rejects non-positive weight', () => {
		expect(shippingRateSchema.safeParse({ ...validBox, weight: 0 }).success).toBe(false);
		expect(shippingRateSchema.safeParse({ ...validBox, weight: -1 }).success).toBe(false);
	});

	it('rejects box without height', () => {
		const { height, ...noHeight } = validBox;
		expect(shippingRateSchema.safeParse(noHeight).success).toBe(false);
	});

	it('rejects empty street', () => {
		expect(shippingRateSchema.safeParse({ ...validBox, street: '' }).success).toBe(false);
	});

	it('allows optional postalCode', () => {
		const { postalCode, ...noPostal } = validBox;
		expect(shippingRateSchema.safeParse(noPostal).success).toBe(true);
	});
});
