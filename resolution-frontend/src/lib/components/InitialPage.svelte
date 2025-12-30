<script lang="ts">
	import heroBg from '$lib/assets/50921f22a05d44613c03ef40313b4bc63628a689.png';
	import darkBg from '$lib/assets/77316c3cefa69a5f71a74bfc3fbf6e3ced95c9f1.png';
	import swirlBg from '$lib/assets/7d2cd0c523acbf0e9b3b9e299fa0ef829a7b2216.png';
	import lightBlueBg from '$lib/assets/7123a57408508b2bae073d991dcf7c17c7f763db.png';
	import fireworks from '$lib/assets/e6e6af4f4af7ca8575187a49893a053c27a7a364.png';
	import sparklyBorder from '$lib/assets/17ec48a0bb8b41dcf6f66b30c45989d5bf71a03a.png';
	import fireworksGif from '$lib/assets/d1b77bc7ffefad4500eb8f570293aeb906cdd6c7.png';
	import note1 from '$lib/assets/3a0136d1eb0536a623e080cb952a19b2a87af70f.png';
	import note2 from '$lib/assets/b4cb411457c810c0897133da6ad9d5ae4468ea27.png';
	import note3 from '$lib/assets/236737bf76b26382113a8a12aa20c3369b57daaa.png';
	import stair from '$lib/assets/488278dc5d3cbf49ab57ddf735369a5419789dc6.png';
	import running from '$lib/assets/00918d266837a309ad05ff4cce9ab7eca6910219.png';
	import vectorLine from '$lib/assets/5dbe0fc43441b95045a7fe03b6870a2d6ca497ac.svg';

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
		heroDescription = "A sentence or two about what it is Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt",
		ctaText = "I'M INSPIRED",
		ctaHref = "/onboarding",
		steps = [
			{ title: "Step 1", description: "asfdskfhsdsdfasdfsdafdsdsfasdfsdaf" },
			{ title: "Step 2", description: "asfdskfhsdsdfasdfsdafdsdsfasdfsdaf" },
			{ title: "Step 3", description: "asfdskfhsdsdfasdfsdafdsdsfasdfsdaf" }
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

		<div class="sparkly-border">
			<img src={sparklyBorder} alt="" />
		</div>
	</section>

	<!-- Steps Section -->
	<section class="steps-section">
		<img src={darkBg} alt="" class="section-bg dark-bg-1" />
		<img src={darkBg} alt="" class="section-bg dark-bg-2" />
		<img src={swirlBg} alt="" class="swirl-overlay" />

		<div class="steps-content">
			<div class="step step-1">
				<p class="step-text">{steps[0].title}:<br/>{steps[0].description}</p>
			</div>

			<div class="step step-2">
				<p class="step-text">{steps[1].title}:<br/>{steps[1].description}</p>
			</div>

			<div class="fireworks-decoration">
				<img src={fireworks} alt="" />
			</div>

			<div class="step step-3">
				<p class="step-text">{steps[2].title}:<br/>{steps[2].description}</p>
			</div>
		</div>
	</section>

	<!-- Stories from Past Events Section -->
	<section class="events-section">
		<img src={lightBlueBg} alt="" class="section-bg" />
		
		<h2 class="events-title">Stories from Past Events</h2>

		<div class="events-grid">
			<div class="event-card event-1">
				<img src={note1} alt="" class="note-bg" />
				<div class="event-content">
					<h3>{events[0].title}</h3>
					<p>{events[0].description}</p>
				</div>
			</div>

			<div class="event-card event-2">
				<img src={note2} alt="" class="note-bg" />
				<div class="event-content">
					<h3>{events[1].title}</h3>
				</div>
			</div>

			<div class="event-card event-3">
				<img src={note3} alt="" class="note-bg" />
				<div class="event-content">
					<h3>{events[2].title}</h3>
				</div>
			</div>
		</div>
	</section>

	<!-- FAQ Section -->
	<section class="faq-section">
		<img src={lightBlueBg} alt="" class="section-bg" />
		
		<div class="running-decoration">
			<img src={running} alt="" />
		</div>

		<h2 class="faq-title">FAQ</h2>

		<div class="faq-wrapper">
			<div class="faq-list">
				{#each faqs as faq, i}
					<div class="faq-item">
						<span class="faq-question">{faq.question}</span>
					</div>
					{#if i < faqs.length - 1}
						<img src={vectorLine} alt="" class="faq-divider" />
					{/if}
				{/each}
			</div>

			<div class="stair-decoration">
				<img src={stair} alt="" />
			</div>
		</div>
	</section>
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
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		z-index: 4;
		pointer-events: none;
	}

	.sparkly-border img {
		width: 100%;
		height: auto;
		display: block;
	}

	/* ========== STEPS SECTION ========== */
	.steps-section {
		position: relative;
		width: 100%;
		background: #0a0e17;
	}

	.section-bg {
		width: 100%;
		height: auto;
		display: block;
	}

	.dark-bg-1 {
		position: relative;
	}

	.dark-bg-2 {
		position: absolute;
		top: 50%;
		left: 0;
	}

	.swirl-overlay {
		position: absolute;
		top: 0;
		left: 0;
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
		height: 100%;
		z-index: 2;
		display: flex;
		flex-direction: column;
		padding: 5% 5%;
	}

	.step {
		max-width: 450px;
	}

	.step-1 {
		align-self: flex-start;
		margin-top: 5%;
	}

	.step-2 {
		align-self: flex-end;
		margin-top: 25%;
	}

	.step-3 {
		align-self: flex-start;
		margin-top: 25%;
	}

	.step-text {
		color: #fff2b9;
		font-size: clamp(1.2rem, 3vw, 2.5rem);
		text-align: center;
		text-shadow: 0 0 10.6px #ffe475;
		line-height: 1.4;
		margin: 0;
	}

	.fireworks-decoration {
		position: absolute;
		right: 0;
		top: 40%;
		width: 30%;
		max-width: 450px;
		z-index: 0;
		pointer-events: none;
	}

	.fireworks-decoration img {
		width: 100%;
		height: auto;
	}

	/* ========== EVENTS SECTION ========== */
	.events-section {
		position: relative;
		width: 100%;
		overflow: hidden;
	}

	.events-section .section-bg {
		position: relative;
	}

	.events-title {
		position: absolute;
		top: 5%;
		left: 50%;
		transform: translateX(-50%);
		font-family: 'Kodchasan', sans-serif;
		font-weight: 400;
		font-style: italic;
		color: #a58d28;
		font-size: clamp(1.5rem, 4vw, 3.5rem);
		text-align: center;
		margin: 0;
		white-space: nowrap;
	}

	.events-grid {
		position: absolute;
		top: 20%;
		left: 0;
		width: 100%;
		height: 60%;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		gap: 2%;
		padding: 0 5%;
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
		transform: rotate(12deg);
		align-self: center;
		margin-top: 10%;
	}

	.event-3 {
		transform: rotate(-21deg);
		align-self: flex-start;
		margin-left: auto;
	}

	.note-bg {
		width: 100%;
		height: auto;
		display: block;
		filter: drop-shadow(0 8px 6px rgba(0, 0, 0, 0.25));
	}

	.event-content {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
		width: 80%;
	}

	.event-content h3 {
		color: #a58d28;
		font-size: clamp(1rem, 2.5vw, 2rem);
		font-weight: 400;
		margin: 0;
	}

	.event-content p {
		color: #a58d28;
		font-size: clamp(0.7rem, 1.2vw, 1rem);
		margin-top: 0.5rem;
		line-height: 1.4;
	}

	/* ========== FAQ SECTION ========== */
	.faq-section {
		position: relative;
		width: 100%;
		overflow: hidden;
	}

	.faq-section .section-bg {
		position: relative;
	}

	.running-decoration {
		position: absolute;
		left: -5%;
		bottom: 10%;
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
		top: 5%;
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
		top: 25%;
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
