<script lang="ts">
	import InitialPage from '$lib/components/InitialPage.svelte';
</script>

<svelte:head>
	<title>Resolution - Choose Your Challenge, Ship Every Week</title>
</svelte:head>

<div class="page-container">
	<InitialPage
		heroDescription="Choose your challenge and ship every week. Earn prizes each week, and a giant prize if you stay til the end."
		ctaText="START BUILDING"
		ctaHref="/api/auth/login"
		showSteps={true}
		showFaq={true}
		steps={[
			{ 
				title: "Choose", 
				description: "Pick workshops that match your skill level — beginner to advanced" 
			},
			{ 
				title: "Build", 
				description: "Work through them at your pace, ship at least one each week" 
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
</style>

