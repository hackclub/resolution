/** Convert an ArrayBuffer or Uint8Array to a base64 string */
export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
	return Buffer.from(buffer).toString('base64');
}
