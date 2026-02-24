<script lang="ts">
	import { onMount } from 'svelte';
	import { fireworks } from '@tsparticles/fireworks';
	import ResolutionPaper from '$lib/components/ResolutionPaper.svelte';

	let showPaper = $state(false);

	function triggerFireworks() {
		fireworks('fireworks-container', {
			colors: ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ffffff'],
			rate: { min: 1, max: 3 },
			speed: { min: 3, max: 8 },
			gravity: 1.5,
			splitCount: { min: 30, max: 50 },
			minHeight: { min: 10, max: 30 }
		});
	}

	onMount(() => {
		const timer = setTimeout(() => {
			showPaper = true;
		}, 500);

		return () => clearTimeout(timer);
	});
</script>

<svelte:head>
	<title>Join Resolution - Stake Your Claim</title>
	<meta
		name="description"
		content="Sign up for Resolution - an 8-week personal goal-setting challenge. Ship every week, earn prizes, and be part of the few who follow through."
	/>
</svelte:head>

<div class="onboarding">
	<div class="bg-first"></div>
	<div id="fireworks-container" class="fireworks-container"></div>
	<ResolutionPaper visible={showPaper} onSuccess={triggerFireworks} />
</div>

<style>
	.onboarding {
		position: relative;
		min-height: 100vh;
		width: 100%;
		overflow: hidden;
	}

	.bg-first {
		position: absolute;
		inset: 0;
		background-image: url('$lib/assets/onboarding_bg.png');
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
	}

	.fireworks-container {
		position: absolute;
		inset: 0;
		z-index: 1;
		pointer-events: none;
	}
</style>
