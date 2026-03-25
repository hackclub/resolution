export const PATHWAYS = [
	{ id: 'PYTHON', label: 'Python', icon: 'terminal', color: 'ec3750' },
	{ id: 'RUST', label: 'Rust', icon: 'terminal', color: '338eda' },
	{ id: 'GAME_DEV', label: 'Game Dev', icon: 'controls', color: '33d6a6' },
	{ id: 'HARDWARE', label: 'Hardware', icon: 'settings', color: 'ff8c37' },
	{ id: 'DESIGN', label: 'Design', icon: 'idea', color: 'a633d6' },
	{ id: 'GENERAL_CODING', label: 'General Coding', icon: 'code', color: '5bc0de' }
] as const;

export type PathwayId = (typeof PATHWAYS)[number]['id'];

export const PATHWAY_IDS: string[] = PATHWAYS.map((p) => p.id);

export const PATHWAY_INFO: Record<string, { label: string; icon: string; color: string }> = Object.fromEntries(
	PATHWAYS.map((p) => [p.id, { label: p.label, icon: p.icon, color: p.color }])
);

export const PATHWAY_LABELS: Record<string, string> = Object.fromEntries(
	PATHWAYS.map((p) => [p.id, p.label])
);
