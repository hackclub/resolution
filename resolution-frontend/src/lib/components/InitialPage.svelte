<script lang="ts">
	import heroBg from '$lib/assets/hero_bg.png';
	import darkBg from '$lib/assets/dark_bg.png';
	import swirlBg from '$lib/assets/swirl_overlay.png';
	import lightBlueBg from '$lib/assets/light_blue_bg.png';
	import fireworks from '$lib/assets/firework_burst.png';
	import sparklyBorder from '$lib/assets/gold_glitter_border.png';
	import fireworksGif from '$lib/assets/fireworks_gif.png';
	import stair from '$lib/assets/stair.png';
	import running from '$lib/assets/running_person.png';
	import vectorLine from '$lib/assets/vector_divider.svg';
	
	import EventCard1 from './EventCard1.svelte';
	import EventCard2 from './EventCard2.svelte';
	import EventCard3 from './EventCard3.svelte';

	interface Step {
		title: string;
		description: string;
	}

	interface Event {
		title: string;
		description: string;
		rotation?: number;
	}

	interface FAQ {
		question: string;
		answer?: string;
	}

	let {
		heroDescription = "Ship every week. Earn prizes. When others quit, their share becomes yours.",
		ctaText = "STAKE YOUR CLAIM",
		ctaHref = "/onboarding",
		steps = [
			{ title: "⭐ One Star", description: "~2hr/week • 8 weeks • $80 prize pool. Light commitment, real rewards." },
			{ title: "⭐⭐ Two Star", description: "~5hr/week • 8 weeks • $200 prize pool. Serious growth, bigger prizes." },
			{ title: "⭐⭐⭐ Three Star", description: "~9hr/week • 8 weeks • $360 prize pool. Maximum effort, maximum payout." }
		] as Step[],
		events = [
			{ title: "Event 1", description: "Lorem ipsum dolor sit amet consectetur adipiscing elit" },
			{ title: "Event 2", description: "Lorem ipsum dolor sit amet consectetur adipiscing elit", rotation: 12 },
			{ title: "Event 3", description: "Lorem ipsum dolor sit amet consectetur adipiscing elit", rotation: -21 }
		] as Event[],
		faqs = [
			{ question: "Question 1" },
			{ question: "Question 2" },
			{ question: "Question 3" },
			{ question: "Question 4" },
			{ question: "Question 5" }
		] as FAQ[]
	} = $props();
</script>

<div class="initial-page">
	<!-- Hero Section -->
	<section class="hero">
		<img src={heroBg} alt="" class="hero-bg" />
		
		<div class="fireworks-left">
			<img src={fireworksGif} alt="" />
		</div>
		<div class="fireworks-right">
			<img src={fireworksGif} alt="" />
		</div>

		<div class="hero-content">
			<p class="hero-description">{heroDescription}</p>

			<a href={ctaHref} class="cta-button">
				<span>{ctaText}</span>
			</a>
		</div>
	</section>

<!--	&lt;!&ndash; Sparkly Border Divider &ndash;&gt;-->
<!--	<div class="sparkly-border">-->
<!--		<img src={sparklyBorder} alt="" />-->
<!--	</div>-->

<!--	&lt;!&ndash; Steps Section &ndash;&gt;-->
<!--	<section class="steps-section">-->
<!--		<img src={darkBg} alt="" class="section-bg dark-bg-1" />-->
<!--		<img src={darkBg} alt="" class="section-bg dark-bg-2" />-->
<!--		<img src={swirlBg} alt="" class="swirl-overlay" />-->
<!--		-->
<!--		<div class="big-firework">-->
<!--			<img src={fireworks} alt="" />-->
<!--		</div>-->

<!--		<div class="steps-content">-->
<!--			<div class="step step-1">-->
<!--				<p class="step-text">{steps[0].title}:<br/>{steps[0].description}</p>-->
<!--			</div>-->

<!--			<div class="step step-2">-->
<!--				<p class="step-text">{steps[1].title}:<br/>{steps[1].description}</p>-->
<!--			</div>-->

<!--			<div class="fireworks-decoration">-->
<!--				<img src={fireworks} alt="" />-->
<!--			</div>-->

<!--			<div class="step step-3">-->
<!--				<p class="step-text">{steps[2].title}:<br/>{steps[2].description}</p>-->
<!--			</div>-->
<!--		</div>-->
<!--	</section>-->

<!--	&lt;!&ndash; Events & FAQ Section (combined on same light blue background) &ndash;&gt;-->
<!--	<section class="events-faq-section">-->
<!--		<img src={lightBlueBg} alt="" class="section-bg" />-->
<!--		-->
<!--		&lt;!&ndash; Stories from Past Events &ndash;&gt;-->
<!--		<h2 class="events-title">Stories from Past Events</h2>-->

<!--		<div class="events-grid">-->
<!--			<div class="event-card event-1">-->
<!--				<EventCard1 title={events[0].title} description={events[0].description} />-->
<!--			</div>-->

<!--			<div class="event-card event-2">-->
<!--				<EventCard2 title={events[1].title} />-->
<!--			</div>-->

<!--			<div class="event-card event-3">-->
<!--				<EventCard3 title={events[2].title} />-->
<!--			</div>-->
<!--		</div>-->

<!--		&lt;!&ndash; FAQ &ndash;&gt;-->
<!--		<div class="running-decoration">-->
<!--			<img src={running} alt="" />-->
<!--		</div>-->

<!--		<h2 class="faq-title">FAQ</h2>-->

<!--		<div class="faq-wrapper">-->
<!--			<div class="faq-list">-->
<!--				{#each faqs as faq, i}-->
<!--					<div class="faq-item">-->
<!--						<span class="faq-question">{faq.question}</span>-->
<!--					</div>-->
<!--					{#if i < faqs.length - 1}-->
<!--						<img src={vectorLine} alt="" class="faq-divider" />-->
<!--					{/if}-->
<!--				{/each}-->
<!--			</div>-->

<!--			<div class="stair-decoration">-->
<!--				<img src={stair} alt="" />-->
<!--			</div>-->
<!--		</div>-->
<!--	</section>-->
</div>

<style>
	.initial-page {
		width: 100%;
		overflow-x: hidden;
		font-family: 'Kodchasan', sans-serif;
	}

	/* ========== HERO SECTION ========== */
	.hero {
		position: relative;
		width: 100%;
		height: auto;
		min-height: 100vh;
		overflow: hidden;
	}

	.hero-bg {
		width: 100%;
		height: auto;
		display: block;
	}

	.fireworks-left,
	.fireworks-right {
		position: absolute;
		top: 0;
		width: 45%;
		max-width: 600px;
		z-index: 2;
	}

	.fireworks-left {
		left: 0;
	}

	.fireworks-right {
		right: 0;
		transform: scaleX(-1) scaleY(-1);
	}

	.fireworks-left img,
	.fireworks-right img {
		width: 100%;
		height: auto;
	}

	.hero-content {
		position: absolute;
		bottom: 15%;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
		z-index: 3;
		width: 90%;
		max-width: 800px;
	}

	.hero-description {
		color: #ffe475;
		font-size: clamp(1rem, 2vw, 2.5rem);
		text-align: center;
		text-shadow: 0 0 12.8px #ffe475;
		line-height: 1.6;
		margin: 0;
	}

	.cta-button {
		background: rgba(253, 205, 5, 0.36);
		border: 6px solid rgba(253, 205, 5, 0.69);
		border-radius: 50px;
		box-shadow: 0 0 13.6px 5px #ffe475;
		padding: 1rem 3rem;
		text-decoration: none;
		transition: all 0.3s ease;
		cursor: pointer;
		display: inline-block;
	}

	.cta-button:hover {
		background: rgba(253, 205, 5, 0.5);
		transform: scale(1.05);
	}

	.cta-button span {
		color: #fff0af;
		font-size: clamp(1.5rem, 4vw, 4rem);
		font-weight: 400;
		white-space: nowrap;
	}

	.sparkly-border {
		position: relative;
		width: 100%;
		z-index: 15;
		pointer-events: none;
		transform: translateY(-115%);
		margin-bottom: -15%;
	}

	.sparkly-border img {
		width: 100%;
		height: auto;
		display: block;
		object-fit: cover;
	}

	/* ========== STEPS SECTION ========== */
	.steps-section {
		position: relative;
		width: 100%;
		background: #0a0e17;
		margin-top: -10%;
	}

	.section-bg {
		width: 100%;
		height: auto;
		display: block;
	}

	.dark-bg-1 {
		position: absolute;
		top: 0;
		right: 0;
		left: auto;
	}

	.dark-bg-2 {
		position: absolute;
		top: 50%;
		left: 0;
	}

	.swirl-overlay {
		position: relative;
		width: 100%;
		height: auto;
		z-index: 1;
		pointer-events: none;
	}

	.steps-content {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 65%;
		z-index: 2;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 3% 5% 5%;
	}

	.step {
		max-width: 450px;
	}

	.step-1 {
		align-self: flex-start;
		margin-left: 25%;
	}

	.step-2 {
		align-self: flex-end;
		margin-right: 15%;
	}

	.step-3 {
		align-self: flex-end;
		margin-right: 25%;
	}

	.step-text {
		color: #fff2b9;
		font-size: clamp(1.2rem, 3vw, 2.5rem);
		text-align: center;
		text-shadow: 0 0 10.6px #ffe475;
		line-height: 1.4;
		margin: 0;
	}

	.big-firework {
		position: absolute;
		left: -125%;
		top: 5%;
		width: 160%;
		/*max-width: 2400px;*/
		z-index: 1;
		pointer-events: none;
		transform: rotate(-40deg);
		filter: blur(10px);
		opacity: 0.85;
	}

	.big-firework img {
		width: 100%;
		height: auto;
	}

	.fireworks-decoration {
		position: absolute;
		right: -15%;
		top: 40%;
		width: 80%;
		z-index: 3;
		pointer-events: none;
	}

	.fireworks-decoration img {
		width: 100%;
		height: auto;
	}

	/* ========== EVENTS & FAQ SECTION ========== */
	.events-faq-section {
		position: relative;
		width: 100%;
		background: #a8d4f5;
	}

	.events-faq-section .section-bg {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		z-index: 0;
	}

	.events-faq-section .events-title,
	.events-faq-section .events-grid,
	.events-faq-section .faq-title,
	.events-faq-section .faq-wrapper,
	.events-faq-section .running-decoration {
		position: relative;
		z-index: 1;
	}

	.events-title {
		font-family: 'Kodchasan', sans-serif;
		font-weight: 400;
		font-style: italic;
		color: #a58d28;
		font-size: clamp(1.5rem, 4vw, 3.5rem);
		text-align: center;
		margin: 0;
		padding: 8rem 0 2rem;
		white-space: nowrap;
	}

	.events-grid {
		display: flex;
		justify-content: center;
		align-items: flex-start;
		gap: 2%;
		padding: 2rem 5% 4rem;
		flex-wrap: wrap;
	}

	.event-card {
		position: relative;
		width: 30%;
		max-width: 350px;
		flex-shrink: 0;
	}

	.event-1 {
		align-self: flex-start;
	}

	.event-2 {
		align-self: center;
		margin-top: 10%;
	}

	.event-3 {
		align-self: flex-start;
		margin-left: auto;
	}

	/* ========== FAQ ELEMENTS (within combined section) ========== */
	.running-decoration {
		position: absolute;
		left: -5%;
		bottom: 5%;
		width: 25%;
		max-width: 350px;
		z-index: 1;
		transform: rotate(162deg) scaleY(-1);
		pointer-events: none;
	}

	.running-decoration img {
		width: 100%;
		height: auto;
	}

	.faq-title {
		position: absolute;
		bottom: 35%;
		left: 50%;
		transform: translateX(-50%);
		font-family: 'Kodchasan', sans-serif;
		font-weight: 700;
		color: white;
		font-size: clamp(4rem, 12vw, 15rem);
		text-align: center;
		margin: 0;
	}

	.faq-wrapper {
		position: absolute;
		bottom: 5%;
		left: 50%;
		transform: translateX(-50%);
		width: 90%;
		max-width: 1000px;
		display: flex;
		align-items: flex-start;
		gap: 2rem;
	}

	.faq-list {
		background: white;
		border-radius: 60px;
		padding: 2rem 3rem;
		flex: 1;
		max-width: 700px;
	}

	.faq-item {
		padding: 1rem 0;
	}

	.faq-divider {
		width: 100%;
		height: auto;
		display: block;
	}

	.faq-question {
		font-family: 'Kodchasan', sans-serif;
		font-weight: 600;
		color: #91c8ff;
		font-size: clamp(1rem, 2.5vw, 2rem);
	}

	.stair-decoration {
		width: 50%;
		max-width: 400px;
		flex-shrink: 0;
		pointer-events: none;
	}

	.stair-decoration img {
		width: 100%;
		height: auto;
	}

	/* ========== RESPONSIVE ========== */
	@media (max-width: 768px) {
		.fireworks-left,
		.fireworks-right {
			width: 50%;
		}

		.hero-content {
			bottom: 10%;
		}

		.step {
			max-width: 90%;
		}

		.step-1,
		.step-2,
		.step-3 {
			align-self: center;
			margin-top: 15%;
		}

		.events-grid {
			flex-direction: column;
			align-items: center;
			gap: 1rem;
			top: 15%;
			height: auto;
		}

		.event-card {
			width: 60%;
			max-width: 300px;
		}

		.event-2,
		.event-3 {
			transform: none;
			margin: 0;
		}

		.faq-wrapper {
			flex-direction: column;
			align-items: center;
		}

		.faq-list {
			border-radius: 40px;
			padding: 1.5rem 2rem;
		}

		.running-decoration,
		.stair-decoration {
			display: none;
		}
	}
</style>
