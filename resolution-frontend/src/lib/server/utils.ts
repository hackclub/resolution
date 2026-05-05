/** Convert an ArrayBuffer or Uint8Array to a base64 string */
export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
	const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
	return Buffer.from(bytes).toString('base64');
}
