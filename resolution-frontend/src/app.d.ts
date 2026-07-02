declare global {
  namespace App {
    interface Locals {
      user: import('lucia').User | null;
      session: import('lucia').Session | null;
      /** Per-request Server-Timing marks, collected in hooks + load fns. */
      timings?: Array<{ name: string; dur: number; desc?: string }>;
    }
  }
}

export {};
