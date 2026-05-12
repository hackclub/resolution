// Intelligent packaging selection for warehouse orders.
//
// Tiers tried in order: lettermail -> bubble mailer -> box. The first tier
// whose container fits all items wins. Items are rotated in the L/W plane
// only; quantities of the same item stack by height.

export interface PackagingItem {
	lengthIn: number;
	widthIn: number;
	heightIn: number;
	weightGrams: number;
	quantity: number;
}

export type PackagingCategory = 'lettermail' | 'bubble_mailer' | 'box';

export interface Packaging {
	category: PackagingCategory;
	lengthIn: number;
	widthIn: number;
	heightIn: number;
	weightGrams: number;
	label: string;
	subjectToChange?: boolean;
}

export interface Box {
	lengthIn: number;
	widthIn: number;
	heightIn: number;
}

// Stocked box sizes (interior, inches). Order matters only for tie-breaking;
// selection walks these sorted by volume ascending.
export const BOXES: Box[] = [
	{ lengthIn: 6, widthIn: 4, heightIn: 4 },
	{ lengthIn: 8, widthIn: 6, heightIn: 4 },
	{ lengthIn: 12, widthIn: 10, heightIn: 4 },
	{ lengthIn: 10, widthIn: 8, heightIn: 6 },
	{ lengthIn: 14, widthIn: 10, heightIn: 8 }
];

const LETTERMAIL_ENVELOPE = { lengthIn: 7, widthIn: 5, heightIn: 3 / 25.4 };
const BUBBLE_MAILER = { lengthIn: 10, widthIn: 6 };
const BUBBLE_MAILER_MAX_HEIGHT_IN = 20 / 25.4;

// Canada Post letter-tier ceilings in mm.
const LETTERMAIL_MAX_L_MM = 245;
const LETTERMAIL_MAX_W_MM = 156;
const LETTERMAIL_MAX_H_MM = 5;
const LETTERMAIL_MIN_WEIGHT_G = 2;
const LETTERMAIL_MAX_WEIGHT_G = 30;

const BUBBLE_MAX_L_MM = 380;
const BUBBLE_MAX_W_MM = 270;
const BUBBLE_MAX_H_MM = 20;
const BUBBLE_MIN_WEIGHT_G = 5;
const BUBBLE_MAX_WEIGHT_G = 500;

const INCHES_TO_MM = 25.4;

function totalWeight(items: PackagingItem[]): number {
	return items.reduce((sum, it) => sum + it.weightGrams * it.quantity, 0);
}

function itemFootprintFits(item: PackagingItem, L: number, W: number): boolean {
	// Rotate in L/W plane: (l,w) or (w,l).
	return (item.lengthIn <= L && item.widthIn <= W) || (item.widthIn <= L && item.lengthIn <= W);
}

// Try to pack items into a container with interior floor L x W. Stack by height.
// Returns the total stack height, or Infinity if any item can't fit the footprint.
export function packHeight(items: PackagingItem[], L: number, W: number): number {
	const sorted = [...items].sort(
		(a, b) => b.lengthIn * b.widthIn - a.lengthIn * a.widthIn
	);
	let stack = 0;
	for (const it of sorted) {
		if (!itemFootprintFits(it, L, W)) return Infinity;
		stack += it.heightIn * it.quantity;
	}
	return stack;
}

function fitsBox(items: PackagingItem[], box: Box): boolean {
	return packHeight(items, box.lengthIn, box.widthIn) <= box.heightIn;
}

function boxVolume(b: Box): number {
	return b.lengthIn * b.widthIn * b.heightIn;
}

function boxLabel(b: Box): string {
	return `Box: ${b.lengthIn}×${b.widthIn}×${b.heightIn}"`;
}

export function selectPackaging(items: PackagingItem[]): Packaging {
	if (items.length === 0) {
		throw new Error('selectPackaging requires at least one item');
	}

	const weight = totalWeight(items);

	// --- Tier 1: Lettermail (flat, tiny) ---
	const letterH = packHeight(items, LETTERMAIL_ENVELOPE.lengthIn, LETTERMAIL_ENVELOPE.widthIn);
	const letterMaxL = Math.max(LETTERMAIL_ENVELOPE.lengthIn, LETTERMAIL_ENVELOPE.widthIn) * INCHES_TO_MM;
	const letterMaxW = Math.min(LETTERMAIL_ENVELOPE.lengthIn, LETTERMAIL_ENVELOPE.widthIn) * INCHES_TO_MM;
	if (
		letterH * INCHES_TO_MM <= LETTERMAIL_MAX_H_MM &&
		letterMaxL <= LETTERMAIL_MAX_L_MM &&
		letterMaxW <= LETTERMAIL_MAX_W_MM &&
		weight >= LETTERMAIL_MIN_WEIGHT_G &&
		weight <= LETTERMAIL_MAX_WEIGHT_G
	) {
		return {
			category: 'lettermail',
			lengthIn: LETTERMAIL_ENVELOPE.lengthIn,
			widthIn: LETTERMAIL_ENVELOPE.widthIn,
			heightIn: LETTERMAIL_ENVELOPE.heightIn,
			weightGrams: weight,
			label: 'Lettermail (5×7" envelope)'
		};
	}

	// --- Tier 2: Bubble mailer 6×10" (oversize lettermail) ---
	const bubbleH = packHeight(items, BUBBLE_MAILER.lengthIn, BUBBLE_MAILER.widthIn);
	const bubbleMaxL = Math.max(BUBBLE_MAILER.lengthIn, BUBBLE_MAILER.widthIn) * INCHES_TO_MM;
	const bubbleMaxW = Math.min(BUBBLE_MAILER.lengthIn, BUBBLE_MAILER.widthIn) * INCHES_TO_MM;
	if (
		bubbleH <= BUBBLE_MAILER_MAX_HEIGHT_IN &&
		bubbleH * INCHES_TO_MM <= BUBBLE_MAX_H_MM &&
		bubbleMaxL <= BUBBLE_MAX_L_MM &&
		bubbleMaxW <= BUBBLE_MAX_W_MM &&
		weight >= BUBBLE_MIN_WEIGHT_G &&
		weight <= BUBBLE_MAX_WEIGHT_G
	) {
		return {
			category: 'bubble_mailer',
			lengthIn: BUBBLE_MAILER.lengthIn,
			widthIn: BUBBLE_MAILER.widthIn,
			heightIn: bubbleH,
			weightGrams: weight,
			label: 'Bubble mailer 6×10"'
		};
	}

	// --- Tier 3: Box ---
	const sortedBoxes = [...BOXES].sort((a, b) => boxVolume(a) - boxVolume(b));
	for (const box of sortedBoxes) {
		if (fitsBox(items, box)) {
			return {
				category: 'box',
				lengthIn: box.lengthIn,
				widthIn: box.widthIn,
				heightIn: box.heightIn,
				weightGrams: weight,
				label: boxLabel(box)
			};
		}
	}

	// Nothing fits — pick the largest box and flag for review.
	const largest = sortedBoxes[sortedBoxes.length - 1];
	return {
		category: 'box',
		lengthIn: largest.lengthIn,
		widthIn: largest.widthIn,
		heightIn: largest.heightIn,
		weightGrams: weight,
		label: boxLabel(largest),
		subjectToChange: true
	};
}
