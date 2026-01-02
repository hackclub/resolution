<script lang="ts">
	import InitialPage from '$lib/components/InitialPage.svelte';
</script>

<InitialPage
	heroDescription="Ship every week. Earn prizes. When others quit, their share becomes yours."
	ctaText="STAKE YOUR CLAIM"
	ctaHref="/onboarding"
	steps={[
		{ title: "⭐ One Star", description: "~2hr/week • 8 weeks • $80 prize pool. Light commitment, real rewards." },
		{ title: "⭐⭐ Two Star", description: "~5hr/week • 8 weeks • $200 prize pool. Serious growth, bigger prizes." },
		{ title: "⭐⭐⭐ Three Star", description: "~9hr/week • 8 weeks • $360 prize pool. Maximum effort, maximum payout." }
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
