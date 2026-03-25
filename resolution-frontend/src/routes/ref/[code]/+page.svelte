<script lang="ts">
	import type { PageData } from './$types';
	import InitialPage from '$lib/components/InitialPage.svelte';

	import { PATHWAY_INFO } from '$lib/pathways';

	let { data }: { data: PageData } = $props();

	const pathwayInfo = PATHWAY_INFO;

	const info = pathwayInfo[data.pathway] || { label: data.pathway, icon: 'code', color: '5bc0de' };
</script>

<svelte:head>
	<title>Join {info.label} - Resolution</title>
</svelte:head>

<div class="page-container">
	<div class="referral-banner">
		<img
			src={`https://icons.hackclub.com/api/icons/${info.color}/${info.icon}`}
			alt={info.label}
			width="32"
			height="32"
		/>
		<p>
			<strong>{data.ambassadorName}</strong> invited you to join the <strong>{info.label}</strong> pathway!
		</p>
	</div>

	<InitialPage
		heroDescription={`You've been invited to the ${info.label} pathway! Join Resolution, ship every week, and earn prizes.`}
		ctaText={`JOIN ${info.label.toUpperCase()}`}
		ctaHref="/api/auth/login"
		showSteps={true}
		showFaq={true}
		steps={[
			{
				title: "Choose",
				description: `You'll automatically join the ${info.label} pathway, but you can choose up to 3 pathways.`
			},
			{
				title: "Build",
				description: "Work through workshops at your pace, ship at least one each week"
			},
			{
				title: "Level Up",
				description: "Do more, earn more. Complete all 8 weeks for bonus prizes"
			}
		]}
		faqs={[
			{
				question: "What if I'm a total beginner?",
				answer: "Perfect! Start with beginner workshops (⭐). They're designed for people with zero experience. You'll learn by building real projects, not watching tutorials."
			},
			{
				question: "How much time does it take each week?",
				answer: "Most workshops take 2-5 hours to complete. You can spread that across the week however works for you. Ship at least one project per week to stay on track."
			},
			{
				question: "What counts as 'shipping'?",
				answer: "Shipping means finishing something and sharing it. A working demo, a live website, a GitHub repo — something real that exists in the world, not just on your laptop."
			},
			{
				question: "Can I do my own project instead?",
				answer: "Yes! You can follow workshops or build your own thing. The only rule is you ship something every week. Mix and match however you want."
			},
			{
				question: "What are the prizes?",
				answer: "Complete workshops to earn points. More ships = more prizes. We'll announce specific prizes before the program starts. Think stickers, hardware, and bragging rights."
			}
		]}
	/>
</div>

<style>
	.page-container {
		padding: 0 0.5rem;
		background-color: var(--color-bg-dark);
	}

	.referral-banner {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		background: var(--color-cta-bg);
		border-bottom: 2px solid var(--color-cta-border);
		position: relative;
		z-index: 10;
	}

	.referral-banner p {
		margin: 0;
		font-family: var(--font-primary);
		font-size: 1rem;
		color: var(--color-gold-light);
	}
</style>
