<script lang="ts">
	import InitialPage from '$lib/components/InitialPage.svelte';
</script>

<svelte:head>
	<title>Resolution - Ship Every Week, Earn Prizes</title>
</svelte:head>

<div class="page-container">
	<InitialPage
		heroDescription="Ship every week. Earn prizes. Most people quit. Will you be different?"
		ctaText="I'M INSPIRED"
		ctaHref="/rsvp"
		showSteps={true}
		showEvents={true}
		showFaq={true}
		steps={[
			{ title: 'Step 1', description: 'Put something here' },
			{ title: 'Step 2', description: 'Put something here' },
			{ title: 'Step 3', description: 'Put something here' }
		]}
		events={[
			{ title: 'Event 1', description: 'Put something here.' },
			{ title: 'Event 2', description: 'Put something here.', rotation: 12 },
			{ title: 'Event 3', description: 'Put something here.', rotation: -21 }
		]}
		faqs={[
			{ question: 'Question 1' },
			{ question: 'Question 2' },
			{ question: 'Question 3' },
			{ question: 'Question 4' },
			{ question: 'Question 5' }
		]}
	/>
</div>

<style>
	.page-container {
		padding: 0 0.5rem;
		background-color: var(--color-bg-dark);
	}
</style>
