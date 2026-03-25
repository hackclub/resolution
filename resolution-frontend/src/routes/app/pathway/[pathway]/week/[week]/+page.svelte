<script lang="ts">
	import type { PageData } from './$types';
	import WeekLayout from '$lib/components/WeekLayout.svelte';

	let { data }: { data: PageData } = $props();
</script>

<WeekLayout
	pathwayId={data.pathwayId}
	weekNumber={data.weekNumber}
	title={data.title}
	content={data.content}
>
	{#snippet footer()}
		<div class="ship-section">
			<div class="ship-divider"></div>
			<h2>Ready to ship?</h2>
			<p>Finished your project for this week? Submit it to earn rewards!</p>
			<a href="/app/pathway/{data.pathwayId.toLowerCase()}/week/{data.weekNumber}/ship" class="ship-btn">
				Ship Project
			</a>
		</div>
	{/snippet}
</WeekLayout>

<style>
	.ship-section {
		text-align: center;
		padding-top: 1.5rem;
	}

	.ship-divider {
		border-top: 1px solid #e0e0e0;
		margin-bottom: 1.5rem;
	}

	.ship-section h2 {
		font-size: 1.25rem;
		margin: 0 0 0.5rem 0;
		color: #1a1a2e;
	}

	.ship-section p {
		color: #8492a6;
		margin: 0 0 1.25rem 0;
	}

	.ship-btn {
		display: inline-block;
		padding: 0.75rem 2rem;
		background: #33d6a6;
		color: white;
		text-decoration: none;
		border-radius: 12px;
		font-weight: 600;
		font-family: 'Kodchasan', sans-serif;
		font-size: 1rem;
		transition: background 0.2s ease;
	}

	.ship-btn:hover {
		background: #2bc299;
	}
</style>
