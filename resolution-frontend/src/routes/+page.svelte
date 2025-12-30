<script lang="ts">
	import InitialPage from '$lib/components/InitialPage.svelte';
</script>

<InitialPage
	heroDescription="A sentence or two about what it is Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt"
	ctaText="I'M INSPIRED"
	ctaHref="/onboarding"
	steps={[
		{ number: 1, title: "Step 1", description: "Capture Your Intentions - Resolution helps you turn fleeting thoughts into concrete goals." },
		{ number: 2, title: "Step 2", description: "Track Your Progress - Follow your journey from the first spark to full realization." },
		{ number: 3, title: "Step 3", description: "Celebrate Success - Every milestone reached is a reason to celebrate." }
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
