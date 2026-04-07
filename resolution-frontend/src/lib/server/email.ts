import type { shopOrder } from './db/schema';

type ShopOrderRow = typeof shopOrder.$inferSelect;

export interface FulfillmentTracking {
	trackingNumber: string;
	carrier: string;
}

/**
 * Send a fulfillment notification email to the participant who placed a shop order.
 *
 * TODO: wire up to the Resolution email API once available. Keep this signature
 * stable so swapping in the real implementation is a drop-in change.
 */
export async function sendFulfillmentEmail(
	order: ShopOrderRow,
	tracking: FulfillmentTracking
): Promise<void> {
	console.log('[email:stub] fulfillment', {
		orderId: order.id,
		to: order.email,
		trackingNumber: tracking.trackingNumber,
		carrier: tracking.carrier
	});
}
