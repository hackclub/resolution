<script>
	import { onMount } from 'svelte';
	import ResolutionPaper from '$lib/components/ResolutionPaper.svelte';

	let showPaper = $state(false);

	onMount(() => {
		setTimeout(() => {
			showPaper = true;
		}, 500);
	});
</script>

<div class="onboarding">
	<div class="bg-first"></div>
	<ResolutionPaper visible={showPaper} />
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
</style>
