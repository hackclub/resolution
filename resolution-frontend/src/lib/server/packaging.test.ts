import { describe, it, expect } from 'vitest';
import { selectPackaging, packHeight, BOXES, type PackagingItem } from './packaging';

const sticker = (over: Partial<PackagingItem> = {}): PackagingItem => ({
	lengthIn: 3,
	widthIn: 3,
	heightIn: 0.05,
	weightGrams: 5,
	quantity: 1,
	...over
});

const tshirt = (over: Partial<PackagingItem> = {}): PackagingItem => ({
	lengthIn: 9,
	widthIn: 6,
	heightIn: 0.3,
	weightGrams: 180,
	quantity: 1,
	...over
});

const flatPoster = (over: Partial<PackagingItem> = {}): PackagingItem => ({
	// Thinner than 20mm (0.787") but wider than the 6×10 bubble mailer.
	lengthIn: 12,
	widthIn: 9,
	heightIn: 0.5,
	weightGrams: 200,
	quantity: 1,
	...over
});

describe('packHeight', () => {
	it('returns summed heights when every item fits footprint', () => {
		const items = [tshirt({ quantity: 2 })];
		expect(packHeight(items, 10, 6)).toBeCloseTo(0.6);
	});

	it('rotates items in L/W plane', () => {
		const item: PackagingItem = { lengthIn: 6, widthIn: 9, heightIn: 0.3, weightGrams: 100, quantity: 1 };
		expect(packHeight([item], 10, 6)).toBeCloseTo(0.3);
	});

	it('returns Infinity when any item is too big', () => {
		const tooBig: PackagingItem = { lengthIn: 20, widthIn: 5, heightIn: 1, weightGrams: 100, quantity: 1 };
		expect(packHeight([tooBig], 10, 6)).toBe(Infinity);
	});
});

describe('selectPackaging', () => {
	it('routes a small light item to lettermail', () => {
		const pkg = selectPackaging([sticker()]);
		expect(pkg.category).toBe('lettermail');
		expect(pkg.label).toMatch(/Lettermail/);
	});

	it('rejects lettermail when over 30g', () => {
		const pkg = selectPackaging([sticker({ weightGrams: 50 })]);
		expect(pkg.category).not.toBe('lettermail');
	});

	it('rejects lettermail when over 5mm thick and routes to bubble mailer', () => {
		const pkg = selectPackaging([sticker({ heightIn: 0.25, weightGrams: 20 })]);
		expect(pkg.category).toBe('bubble_mailer');
	});

	it('routes two T-shirts to bubble mailer', () => {
		const pkg = selectPackaging([tshirt({ quantity: 2 })]);
		expect(pkg.category).toBe('bubble_mailer');
		expect(pkg.label).toBe('Bubble mailer 6×10"');
		expect(pkg.heightIn).toBeCloseTo(0.6);
	});

	it('rejects bubble mailer when exceeding 500g ceiling', () => {
		const pkg = selectPackaging([tshirt({ weightGrams: 600 })]);
		expect(pkg.category).toBe('box');
	});

	it('rejects bubble mailer when stacked height exceeds 20mm and routes to box', () => {
		// 3 shirts × 0.3in = 0.9in = ~22.9mm, over 20mm limit.
		const pkg = selectPackaging([tshirt({ quantity: 3 })]);
		expect(pkg.category).toBe('box');
	});

	it('routes a flat-but-wider-than-bubble item to the smallest fitting box', () => {
		const pkg = selectPackaging([flatPoster()]);
		expect(pkg.category).toBe('box');
		// 12×9×0.5 should fit the 12×10×4 box.
		expect(pkg.lengthIn).toBe(12);
		expect(pkg.widthIn).toBe(10);
		expect(pkg.heightIn).toBe(4);
	});

	it('picks the smallest-volume box that fits', () => {
		// A mug-like item 4×4×4 at 350g — too heavy for bubble mailer, should
		// fit the 6×4×4 box (smallest by volume).
		const mug: PackagingItem = {
			lengthIn: 4,
			widthIn: 4,
			heightIn: 4,
			weightGrams: 350,
			quantity: 1
		};
		const pkg = selectPackaging([mug]);
		expect(pkg.category).toBe('box');
		expect(pkg.lengthIn).toBe(6);
		expect(pkg.widthIn).toBe(4);
		expect(pkg.heightIn).toBe(4);
	});

	it('flags subjectToChange and returns largest box when nothing fits', () => {
		const huge: PackagingItem = {
			lengthIn: 20,
			widthIn: 20,
			heightIn: 20,
			weightGrams: 5000,
			quantity: 1
		};
		const pkg = selectPackaging([huge]);
		expect(pkg.category).toBe('box');
		expect(pkg.subjectToChange).toBe(true);
		// Largest box: 14×10×8.
		expect(pkg.lengthIn).toBe(14);
		expect(pkg.widthIn).toBe(10);
		expect(pkg.heightIn).toBe(8);
	});

	it('exports the five expected box sizes', () => {
		expect(BOXES).toHaveLength(5);
		const dims = BOXES.map((b) => `${b.lengthIn}×${b.widthIn}×${b.heightIn}`);
		expect(dims).toEqual(
			expect.arrayContaining(['8×6×4', '6×4×4', '10×8×6', '12×10×4', '14×10×8'])
		);
	});
});
