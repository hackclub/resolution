<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import PlatformBackground from '$lib/components/PlatformBackground.svelte';

	let { data }: { data: PageData } = $props();

	const pathwayInfo: Record<string, { label: string; icon: string; color: string }> = {
		PYTHON: { label: 'Python', icon: 'terminal', color: 'ec3750' },
		RUST: { label: 'Rust', icon: 'terminal', color: '338eda' },
		GAME_DEV: { label: 'Game Dev', icon: 'controls', color: '33d6a6' },
		HARDWARE: { label: 'Hardware', icon: 'settings', color: 'ff8c37' },
		DESIGN: { label: 'Design', icon: 'idea', color: 'a633d6' },
		GENERAL_CODING: { label: 'General Coding', icon: 'code', color: '5bc0de' }
	};

	let pathway = $derived(pathwayInfo[data.pathwayId]);
	const weeks = Array.from({ length: 8 }, (_, i) => i + 1);
	let loadedImages = $state(new Set<string>());

	function preloadPrizeImages() {
		const pendingImages: HTMLImageElement[] = [];
		const prizeUrls = new Set(
			weeks.map((week) => getPrizeImageUrl(week)).filter((url) => url.length > 0)
		);

		for (const url of prizeUrls) {
			const img = new Image();
			pendingImages.push(img);

			const cleanupImage = () => {
				img.onload = null;
				img.onerror = null;
				const index = pendingImages.indexOf(img);
				if (index !== -1) pendingImages.splice(index, 1);
			};

			img.onload = () => {
				loadedImages = new Set([...loadedImages, url]);
				cleanupImage();
			};
			img.onerror = cleanupImage;
			img.src = url;
		}

		return () => {
			for (const img of pendingImages) {
				img.onload = null;
				img.onerror = null;
				img.src = '';
			}
		};
	}

	onMount(() => {
		return preloadPrizeImages();
	});

	function isWeekPublished(week: number): boolean {
		return data.publishedWeeks[week]?.isPublished === true;
	}

	function getWeekTitle(week: number): string {
		return data.publishedWeeks[week]?.title || '';
	}

	function getPrizeImageUrl(week: number): string {
		return data.publishedWeeks[week]?.prizeImageUrl || '';
	}
</script>

<svelte:head>
	<title>{pathway.label} - Resolution</title>
</svelte:head>

<PlatformBackground>
	<div class="pathway-container">
		<a href="/app" class="back-link">
			<img src="https://icons.hackclub.com/api/icons/8492a6/back" alt="Back" width="20" height="20" />
			Back to Dashboard
		</a>

		<header>
			<img
				src="https://icons.hackclub.com/api/icons/{pathway.color}/{pathway.icon}"
				alt={pathway.label}
				class="pathway-icon"
			/>
			<h1>{pathway.label}</h1>
			<p class="curator">brought to you by <span>{data.curator}</span></p>
		</header>

		<div class="weeks-grid">
			{#each weeks as week}
				{@const published = isWeekPublished(week)}
				{@const title = getWeekTitle(week)}
				{@const prizeImageUrl = getPrizeImageUrl(week)}
				{#if published}
					<a href="/app/pathway/{data.pathwayId.toLowerCase()}/week/{week}" class="week-card available">
						{#if prizeImageUrl && loadedImages.has(prizeImageUrl)}
							<img src={prizeImageUrl} alt="" aria-hidden="true" class="prize-image" />
						{/if}
						<img src="https://icons.hackclub.com/api/icons/{pathway.color}/checkmark" alt="Available" class="status-icon" />
						<span class="week-number">Week {week}</span>
						{#if title}
							<span class="week-title">{title}</span>
						{/if}
					</a>
				{:else}
					<div class="week-card locked">
						{#if prizeImageUrl && loadedImages.has(prizeImageUrl)}
							<img src={prizeImageUrl} alt="" aria-hidden="true" class="prize-image locked" />
						{/if}
						<img src="https://icons.hackclub.com/api/icons/8492a6/private" alt="Locked" class="lock-icon" />
						<span class="week-number">Week {week}</span>
					</div>
				{/if}
			{/each}
		</div>
	</div>
</PlatformBackground>

<style>
	.pathway-container {
		min-height: 100vh;
		padding: 2rem;
		color: #1a1a2e;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.back-link {
		align-self: flex-start;
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
		text-align: center;
		margin-bottom: 3rem;
	}

	.pathway-icon {
		width: 64px;
		height: 64px;
		margin-bottom: 1rem;
	}

	h1 {
		font-size: 2rem;
		margin: 0 0 0.5rem 0;
	}

	.curator {
		font-size: 1rem;
		color: #8492a6;
		margin: 0;
	}

	.curator span {
		color: #af98ff;
		font-weight: 600;
	}

	.weeks-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1.5rem;
		max-width: 800px;
		width: 100%;
	}

	.week-card {
		position: relative;
		overflow: visible;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 2rem 1.5rem;
		background: rgba(255, 255, 255, 0.85);
		border: 2px solid #8492a6;
		border-radius: 16px;
		font-family: 'Kodchasan', sans-serif;
	}

	.week-card.locked {
		border-color: #b5bfcc;
		background: rgba(255, 255, 255, 0.7);
	}

	.week-card.available {
		text-decoration: none;
		border-color: #33d6a6;
		cursor: pointer;
		transition: transform 0.15s, border-color 0.15s;
	}

	.week-card.available:hover {
		transform: translateY(-2px);
		border-color: #af98ff;
	}

	.prize-image {
		position: absolute;
		top: 0;
		right: 0;
		width: 100px;
		height: 100px;
		object-fit: cover;
		pointer-events: none;
		transform: translate(22%, -40%) scale(1);
		transition: transform 0.15s ease, opacity 0.15s ease;
		z-index: 2;
	}


	.prize-image.locked {
		opacity: 0.5;
	}

	.lock-icon,
	.status-icon {
		width: 32px;
		height: 32px;
	}

	.week-number {
		font-size: 1rem;
		font-weight: 600;
		color: #8492a6;
	}

	.week-card.available .week-number {
		color: #1a1a2e;
	}

	.week-title {
		font-size: 0.8rem;
		color: #1a1a2e;
		text-align: center;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@media (max-width: 768px) {
		.weeks-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
