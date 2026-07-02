<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import faviconPng from '$lib/assets/resolution_favicon.png';
	import '@fontsource/kodchasan/latin-400.css';
	import '@fontsource/kodchasan/latin-500.css';
	import '@fontsource/kodchasan/latin-600.css';
	import '@fontsource/kodchasan/latin-700.css';
	import '@fontsource/patrick-hand/latin-400.css';
	import '$lib/styles/tokens.css';
	import '$lib/styles/utilities.css';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/png" href={faviconPng} />
	<link rel="icon" href={favicon} />
	<title>Resolution - Ship Every Week, Earn Prizes</title>
	<meta name="description" content="Resolution is an 8-week personal goal-setting challenge for teenage hackers. Pick workshops, commit to weekly goals, and earn prizes for following through." />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta charset="utf-8" />
	<meta property="og:title" content="Resolution - Ship Every Week, Earn Prizes" />
	<meta property="og:description" content="An 8-week challenge where you set goals, ship every week, and earn prizes for following through. Most people quit. Will you be different?" />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

{@render children()}
