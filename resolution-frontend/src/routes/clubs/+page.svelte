<script lang="ts">
	import InitialPage from '$lib/components/InitialPage.svelte';
</script>

<svelte:head>
	<title>Resolution Clubs - Join Your Club, Build Together</title>
	<meta name="description" content="Join Resolution through your Hack Club! Attend weekly club meetings, work through guided lessons together, earn cool prizes, and enjoy free food. Starts March 23." />
</svelte:head>

<div class="page-container">
	<InitialPage
		heroDescription="Join your club's weekly meetings. Work on guided lessons together. Earn cool prizes and free food. Starts March 23."
		ctaText="JOIN YOUR CLUB"
		ctaHref="/api/auth/login"
		showSteps={true}
		showFaq={true}
		steps={[
			{
				title: "Show Up",
				description: "Come to your club's weekly meetings starting March 23"
			},
			{
				title: "Build Together",
				description: "Work through guided lessons with your club, no experience needed!"
			},
			{
				title: "Get Rewarded",
				description: "Earn cool prizes, enjoy free food, and ship real projects"
			}
		]}
		faqs={[
			{
				question: "What happens at club meetings?",
				answer: "Your club leader runs a weekly meeting where everyone works through a guided lesson together. You'll build real projects, help each other out, and have fun (plus there's free food!)"
			},
			{
				question: "Do I need coding experience?",
				answer: "Nope! The guided lessons start from the basics. Your club members and leader are there to help. All you need to do is show up."
			},
			{
				question: "When does it start?",
				answer: "Resolution kicks off March 23. Your club leader will share the meeting schedule, so just show up to your first meeting and you're in."
			},
			{
				question: "What kind of prizes can I earn?",
				answer: "Ship projects each week to earn prizes. Think stickers, hardware, and more. The more you build, the more you earn."
			},
			{
				question: "What if I miss a week?",
				answer: "Life happens! Try to make it to as many meetings as you can. You can still work on lessons outside of meetings to stay on track."
			}
		]}
	/>
</div>

<style>
	.page-container {
		padding: 0 0.5rem;
		background-color: var(--color-bg-dark);
	}
</style>
