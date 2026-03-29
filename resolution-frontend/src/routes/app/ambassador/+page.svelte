<script lang="ts">
	import type { PageData } from './$types';
	import PlatformBackground from '$lib/components/PlatformBackground.svelte';
	import DropOffWidget from '$lib/components/DropOffWidget.svelte';

	let { data }: { data: PageData } = $props();

	const pathwayInfo: Record<string, { label: string; icon: string; color: string }> = {
		PYTHON: { label: 'Python', icon: 'terminal', color: 'ec3750' },
		RUST: { label: 'Rust', icon: 'terminal', color: '338eda' },
		GAME_DEV: { label: 'Game Dev', icon: 'controls', color: '33d6a6' },
		HARDWARE: { label: 'Hardware', icon: 'settings', color: 'ff8c37' },
		DESIGN: { label: 'Design', icon: 'idea', color: 'a633d6' },
		GENERAL_CODING: { label: 'General Coding', icon: 'code', color: '5bc0de' }
	};

	const weeks = Array.from({ length: 8 }, (_, i) => i + 1);

	function getWeekStatus(pathway: string, week: number) {
		const content = data.contentByPathway[pathway]?.[week];
		if (!content) return { status: 'empty', title: '' };
		if (content.isPublished) return { status: 'published', title: content.title };
		return { status: 'draft', title: content.title };
	}
</script>

<svelte:head>
	<title>Ambassador Dashboard - Resolution</title>
</svelte:head>

<PlatformBackground>
	<div class="ambassador-container">
		<a href="/app" class="back-link">
			<img src="https://icons.hackclub.com/api/icons/8492a6/back" alt="Back" width="20" height="20" />
			Back to Dashboard
		</a>

		<header>
			<div class="header-top">
				<div>
					<h1>Ambassador Dashboard</h1>
					<p class="subtitle">Manage your pathway content</p>
				</div>
				<a href="/app/ambassador/referrals" class="referrals-btn">
					<img src="https://icons.hackclub.com/api/icons/a633d6/share" alt="Referrals" width="18" height="18" />
					Referral Links
				</a>
			</div>
		</header>

		<DropOffWidget />

		{#if data.assignments.length === 0}
			<div class="empty-state">
				<p>You haven't been assigned to any pathways yet.</p>
				<p class="hint">Contact an admin to get assigned.</p>
			</div>
		{:else}
			{#each data.assignments as pathway}
				{@const info = pathwayInfo[pathway]}
				<section class="pathway-section">
					<div class="pathway-header">
						<img
							src="https://icons.hackclub.com/api/icons/{info.color}/{info.icon}"
							alt={info.label}
							width="32"
							height="32"
						/>
						<h2>{info.label}</h2>
					</div>

					<div class="weeks-grid">
						{#each weeks as week}
							{@const weekStatus = getWeekStatus(pathway, week)}
							<a href="/app/ambassador/{pathway.toLowerCase()}/week/{week}" class="week-card {weekStatus.status}">
								<span class="week-number">Week {week}</span>
								{#if weekStatus.title}
									<span class="week-title">{weekStatus.title}</span>
								{/if}
								<span class="week-status">
									{#if weekStatus.status === 'published'}
										<img src="https://icons.hackclub.com/api/icons/33d6a6/checkmark" alt="Published" width="16" height="16" />
										Published
									{:else if weekStatus.status === 'draft'}
										<img src="https://icons.hackclub.com/api/icons/ff8c37/edit" alt="Draft" width="16" height="16" />
										Draft
									{:else}
										<img src="https://icons.hackclub.com/api/icons/8492a6/add" alt="Empty" width="16" height="16" />
										Empty
									{/if}
								</span>
							</a>
						{/each}
					</div>
				</section>
			{/each}
		{/if}
	</div>
</PlatformBackground>

<style>
	.ambassador-container {
		min-height: 100vh;
		padding: 2rem;
		color: #1a1a2e;
		max-width: 1000px;
		margin: 0 auto;
	}

	.back-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #8492a6;
		text-decoration: none;
		font-size: 0.9rem;
		margin-bottom: 2rem;
	}

	.back-link:hover {
		color: #1a1a2e;
	}

	header {
		margin-bottom: 2rem;
	}

	.header-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}

	h1 {
		font-size: 1.75rem;
		margin: 0 0 0.5rem 0;
	}

	.subtitle {
		color: #8492a6;
		margin: 0;
	}

	.referrals-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: rgba(255, 255, 255, 0.8);
		border: 1px solid #a633d6;
		color: #a633d6;
		border-radius: 20px;
		font-family: 'Kodchasan', sans-serif;
		text-decoration: none;
		white-space: nowrap;
		font-size: 0.9rem;
	}

	.referrals-btn:hover {
		background: rgba(255, 255, 255, 1);
	}

	.empty-state {
		text-align: center;
		padding: 3rem;
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #af98ff;
		border-radius: 16px;
	}

	.empty-state p {
		margin: 0 0 0.5rem 0;
	}

	.hint {
		color: #8492a6;
		font-size: 0.875rem;
	}

	.pathway-section {
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #af98ff;
		border-radius: 16px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.pathway-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}

	h2 {
		font-size: 1.25rem;
		margin: 0;
	}

	.weeks-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
	}

	.week-card {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		background: white;
		border: 2px solid #e0e0e0;
		border-radius: 12px;
		text-decoration: none;
		color: inherit;
		transition: border-color 0.15s;
	}

	.week-card:hover {
		border-color: #af98ff;
	}

	.week-card.published {
		border-color: #33d6a6;
	}

	.week-card.draft {
		border-color: #ff8c37;
	}

	.week-number {
		font-weight: 600;
		font-size: 0.9rem;
	}

	.week-title {
		font-size: 0.8rem;
		color: #1a1a2e;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.week-status {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		color: #8492a6;
	}

	@media (max-width: 768px) {
		.weeks-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
