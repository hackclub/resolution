/**
 * Lightweight Server-Timing collection.
 *
 * `timed` records how long an async chunk of work takes and stashes it on
 * `locals.timings`. `hooks.server.ts` serializes all marks into a single
 * `Server-Timing` response header, visible in DevTools → Network → Timing.
 */
export async function timed<T>(
	locals: App.Locals,
	name: string,
	fn: () => Promise<T>,
	desc?: string
): Promise<T> {
	const start = performance.now();
	try {
		return await fn();
	} finally {
		locals.timings?.push({ name, dur: performance.now() - start, desc });
	}
}

/** Serialize collected marks into a Server-Timing header value. */
export function serializeTimings(
	marks: Array<{ name: string; dur: number; desc?: string }>
): string {
	return marks
		.map((m) => {
			const parts = [m.name, `dur=${m.dur.toFixed(1)}`];
			if (m.desc) parts.push(`desc="${m.desc.replace(/"/g, '')}"`);
			return parts.join(';');
		})
		.join(', ');
}
