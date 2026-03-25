<script lang="ts">
	import type { Snippet } from 'svelte';
	import PlatformBackground from '$lib/components/PlatformBackground.svelte';
	import SvelteMarkdown from 'svelte-marked';

	interface Props {
		pathwayId: string;
		weekNumber: number;
		title: string;
		content: string;
		renderers?: Record<string, any>;
		footer?: Snippet;
	}

	import { PATHWAY_INFO } from '$lib/pathways';

	let { pathwayId, weekNumber, title, content, renderers = {}, footer }: Props = $props();

	const pathwayInfo = PATHWAY_INFO;

	const pathway = $derived(pathwayInfo[pathwayId]);
</script>

<svelte:head>
	<title>{title || `Week ${weekNumber}`} - {pathway.label} - Resolution</title>
</svelte:head>

<PlatformBackground>
	<div class="week-container">
		<a href="/app/pathway/{pathwayId.toLowerCase()}" class="back-link">
			<img src="https://icons.hackclub.com/api/icons/8492a6/back" alt="Back" width="20" height="20" />
			Back to {pathway.label}
		</a>

		<article class="content-wrapper">
			<header>
				<div class="week-badge" style="background: #{pathway.color}">
					Week {weekNumber}
				</div>
				<h1>{title}</h1>
			</header>

			<div class="prose">
				<SvelteMarkdown source={content} {renderers} />
			</div>

			{#if footer}
				{@render footer()}
			{/if}
			</article>
	</div>
</PlatformBackground>

<style>
	.week-container {
		min-height: 100vh;
		padding: 2rem;
		color: #1a1a2e;
		max-width: 900px;
		margin: 0 auto;
	}

	.back-link {
		display: inline-flex;
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

	.content-wrapper {
		background: rgba(255, 255, 255, 0.95);
		border: 1px solid #af98ff;
		border-radius: 16px;
		padding: 2.5rem;
	}

	header {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.week-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
		margin-bottom: 0.75rem;
	}

	h1 {
		font-size: 2rem;
		margin: 0;
		line-height: 1.3;
	}

	.prose :global(h1) {
		font-size: 1.75rem;
		margin: 2rem 0 1rem 0;
	}

	.prose :global(h2) {
		font-size: 1.5rem;
		margin: 1.75rem 0 0.75rem 0;
	}

	.prose :global(h3) {
		font-size: 1.25rem;
		margin: 1.5rem 0 0.5rem 0;
	}

	.prose :global(p) {
		margin: 0 0 1rem 0;
		line-height: 1.7;
	}

	.prose :global(a) {
		color: #338eda;
	}

	.prose :global(code) {
		background: #f0f0f0;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		font-size: 0.9em;
	}

	.prose :global(pre) {
		background: #1a1a2e;
		color: #f0f0f0;
		padding: 1.25rem;
		border-radius: 8px;
		overflow-x: auto;
		margin: 0 0 1.25rem 0;
	}

	.prose :global(pre code) {
		background: none;
		padding: 0;
	}

	.prose :global(ul),
	.prose :global(ol) {
		margin: 0 0 1rem 0;
		padding-left: 1.5rem;
	}

	.prose :global(li) {
		margin-bottom: 0.5rem;
		line-height: 1.6;
	}

	.prose :global(blockquote) {
		border-left: 4px solid #af98ff;
		margin: 0 0 1rem 0;
		padding: 0.75rem 1rem;
		background: #f8f9fa;
		border-radius: 0 8px 8px 0;
	}

	.prose :global(img) {
		max-width: 100%;
		border-radius: 8px;
		margin: 1rem 0;
	}

	.prose :global(hr) {
		border: none;
		border-top: 1px solid #e0e0e0;
		margin: 2rem 0;
	}

	@media (max-width: 768px) {
		.week-container {
			padding: 1rem;
		}

		.content-wrapper {
			padding: 1.5rem;
		}

		h1 {
			font-size: 1.5rem;
		}
	}
</style>
