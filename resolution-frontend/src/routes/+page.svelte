<script lang="ts">
	import InitialPage from '$lib/components/InitialPage.svelte';
</script>

<InitialPage
	heroDescription="Bet on yourself. When others quit, their stakes become your reward."
	ctaText="STAKE YOUR CLAIM"
	ctaHref="/onboarding"
	steps={[
		{ title: "⭐ One Star", description: "~2hr/week • 8 weeks • $80 stake. Light commitment, real results." },
		{ title: "⭐⭐ Two Star", description: "~5hr/week • 8 weeks • $200 stake. Serious growth, bigger rewards." },
		{ title: "⭐⭐⭐ Three Star", description: "~9hr/week • 8 weeks • $360 stake. Maximum effort, maximum payout." }
	]}
	events={[
		{ title: "Event 1", description: "Join our community workshop on goal setting and accountability." },
		{ title: "Event 2", description: "Monthly reflection sessions to track your progress.", rotation: 12 },
		{ title: "Event 3", description: "Annual celebration of achievements.", rotation: -21 }
	]}
	faqs={[
		{ question: "Question 1" },
		{ question: "Question 2" },
		{ question: "Question 3" },
		{ question: "Question 4" },
		{ question: "Question 5" }
	]}
/>
