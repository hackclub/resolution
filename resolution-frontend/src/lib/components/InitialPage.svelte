<script lang="ts">
	import type { Step, Event, FAQ } from '$lib/types';
	import heroBg from '$lib/assets/hero_bg.png';
	import darkBg from '$lib/assets/dark_bg.png';
	import swirlBg from '$lib/assets/swirl_overlay.png';
	import lightBlueBg from '$lib/assets/light_blue_bg.png';
	import fireworks from '$lib/assets/firework_burst.png';
	import fireworksGif from '$lib/assets/fireworks_gif.png';
	import sparklyBorder from '$lib/assets/gold_glitter_border.png';
	import stair from '$lib/assets/stair.png';
	import running from '$lib/assets/running_person.png';
	import vectorLine from '$lib/assets/vector_divider.svg';
	import { resolve } from '$app/paths';
	import EventCard from './EventCard.svelte';

	interface Props {
		heroDescription?: string;
		ctaText?: string;
		ctaHref?: string;
		steps?: Step[];
		events?: Event[];
		faqs?: FAQ[];
		showSteps?: boolean;
		showEvents?: boolean;
		showFaq?: boolean;
	}

	let {
		heroDescription = 'Ship every week. Earn prizes. Most people quit. Will you be different?',
		ctaText = "I'M INSPIRED",
		ctaHref = '/rsvp',
		steps = [
			{ title: 'Step 1', description: 'asfdskfhsdsdfasdfsdafdsdsfasdfsdaf' },
			{ title: 'Step 2', description: 'asfdskfhsdsdfasdfsdafdsdsfasdfsdaf' },
			{ title: 'Step 3', description: 'asfdskfhsdsdfasdfsdafdsdsfasdfsdaf' }
		],
		events = [
			{ title: 'Event 1', description: 'Lorem ipsum dolor sit amet consectetur adipiscing elit' },
			{
				title: 'Event 2',
				description: 'Lorem ipsum dolor sit amet consectetur adipiscing elit',
				rotation: 12
			},
			{
				title: 'Event 3',
				description: 'Lorem ipsum dolor sit amet consectetur adipiscing elit',
				rotation: -21
			}
		],
		faqs = [
			{ question: 'Question 1' },
			{ question: 'Question 2' },
			{ question: 'Question 3' },
			{ question: 'Question 4' },
			{ question: 'Question 5' }
		],
		showSteps = false,
		showEvents = false,
		showFaq = false
	}: Props = $props();
</script>

<div class="initial-page">
	<!-- HERO SECTION -->
	<section class="hero">
		<img src={heroBg} alt="" class="hero-bg" />

		<div class="decoration fireworks-left">
			<img src={fireworksGif} alt="" />
		</div>
		<div class="decoration fireworks-right">
			<img src={fireworksGif} alt="" />
		</div>

		<div class="hero-content">
			<p class="hero-description">{heroDescription}</p>

			<a href={resolve(ctaHref)} class="cta-button">
				<span>{ctaText}</span>
			</a>
		</div>
	</section>

	<!-- STEPS SECTION -->
	{#if showSteps}
		<section class="steps-section">
			<div class="decoration sparkly-border">
				<img src={sparklyBorder} alt="" />
			</div>

			<div class="steps-backgrounds">
				<img src={darkBg} alt="" class="dark-bg dark-bg-1" />
				<img src={darkBg} alt="" class="dark-bg dark-bg-2" />
				<img src={swirlBg} alt="" class="swirl-overlay" />
			</div>

			<div class="decoration big-firework">
				<img src={fireworks} alt="" />
			</div>

			<div class="decoration fireworks-decoration">
				<img src={fireworks} alt="" />
			</div>

			<div class="steps-content">
				<div class="step step-1">
					<p class="step-text">{steps[0]?.title}:<br />{steps[0]?.description}</p>
				</div>

				<div class="step step-2">
					<p class="step-text">{steps[1]?.title}:<br />{steps[1]?.description}</p>
				</div>

				<div class="step step-3">
					<p class="step-text">{steps[2]?.title}:<br />{steps[2]?.description}</p>
				</div>
			</div>
		</section>
	{/if}

	<!-- EVENTS & FAQ SECTION -->
	{#if showEvents || showFaq}
		<section class="events-faq-section">
			<img src={lightBlueBg} alt="" class="section-bg" />

			{#if showEvents}
				<div class="events-content">
					<h2 class="events-title">
						<svg viewBox="-50 0 700 150" class="curved-text">
							<path id="curve" d="M 0,100 Q 300,140 600,0" fill="transparent" />
							<text>
								<textPath href="#curve" startOffset="50%" text-anchor="middle"
									>Stories from Past Events</textPath
								>
							</text>
						</svg>
					</h2>

					<div class="events-grid">
						<div class="event-card-wrapper event-1">
							<EventCard
								title={events[0]?.title ?? 'Event 1'}
								description={events[0]?.description}
								imageSrc={events[0]?.image}
								variant="yellow"
								rotation={0}
							/>
						</div>

						<div class="event-card-wrapper event-2">
							<EventCard
								title={events[1]?.title ?? 'Event 2'}
								description={events[1]?.description}
								imageSrc={events[1]?.image}
								variant="pink"
								rotation={events[1]?.rotation ?? 12}
							/>
						</div>

						<div class="event-card-wrapper event-3">
							<EventCard
								title={events[2]?.title ?? 'Event 3'}
								description={events[2]?.description}
								imageSrc={events[2]?.image}
								variant="blue"
								rotation={events[2]?.rotation ?? -21}
							/>
						</div>
					</div>
				</div>
			{/if}

			{#if showFaq}
				<div class="faq-section">
					<div class="decoration running-decoration">
						<img src={running} alt="" />
					</div>

					<h2 class="faq-title">FAQ</h2>

					<div class="faq-content">
						<div class="faq-list">
							{#each faqs as faq, i (faq.question)}
								<div class="faq-item">
									<span class="faq-question">{faq.question}</span>
								</div>
								{#if i < faqs.length - 1}
									<img src={vectorLine} alt="" class="faq-divider" />
								{/if}
							{/each}
						</div>

						<div class="decoration stair-decoration">
							<img src={stair} alt="" />
						</div>
					</div>
				</div>
			{/if}
		</section>
	{/if}
</div>

<style>
	.initial-page {
		width: 100%;
		overflow-x: hidden;
		font-family: var(--font-primary);
	}

	/* ========== HERO SECTION ========== */
	.hero {
		position: relative;
		width: 100%;
		overflow: hidden;
	}

	.hero-bg {
		width: 100%;
		height: auto;
		display: block;
	}

	.fireworks-left,
	.fireworks-right {
		top: 0;
		width: 40%;
		max-width: 1035px;
	}

	.fireworks-left {
		left: 1%;
	}

	.fireworks-right {
		left: 45%;
		transform: rotate(180deg) scaleY(-1);
	}

	.hero-content {
		position: absolute;
		top: 63%;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.6rem;
		z-index: var(--z-overlay);
		width: 90%;
		max-width: 560px;
	}

	.hero-description {
		font-family: var(--font-primary);
		font-weight: 400;
		color: var(--color-gold);
		font-size: clamp(0.8rem, 1.2vw, 2rem);
		text-align: center;
		text-shadow: var(--shadow-glow-gold);
		line-height: 1.6;
		margin: 0;
	}

	.cta-button {
		background: var(--color-cta-bg);
		border: 5px solid var(--color-cta-border);
		border-radius: var(--radius-button);
		padding: 0.8rem 2.4rem;
		text-decoration: none;
		transition: all var(--transition-normal);
		cursor: pointer;
		display: inline-block;
	}

	.cta-button:hover {
		background: var(--color-cta-hover);
		transform: scale(1.05);
	}

	.cta-button span {
		color: var(--color-cta-text);
		font-size: clamp(1.2rem, 2.4vw, 4rem);
		font-weight: 400;
		white-space: nowrap;
	}

	/* ========== STEPS SECTION ========== */
	.steps-section {
		position: relative;
		width: 100%;
		aspect-ratio: 2560 / 3385;
	}

	.sparkly-border {
		top: 0;
		left: 0;
		width: 100%;
		height: 8%;
		z-index: 10;
		transform: translateY(-50%);
		overflow: hidden;
	}

	.steps-backgrounds {
		position: absolute;
		inset: 0;
	}

	.dark-bg {
		position: absolute;
		width: 100%;
		height: 50%;
		object-fit: cover;
		z-index: var(--z-base);
	}

	.dark-bg-1 {
		top: 0;
	}

	.dark-bg-2 {
		top: 50%;
	}

	.swirl-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: auto;
		z-index: var(--z-raised);
	}

	.steps-content {
		position: absolute;
		inset: 0;
		z-index: 5;
	}

	.step {
		position: absolute;
		max-width: 22%;
	}

	.step-1 {
		left: 25%;
		top: 12%;
		transform: translateX(-50%);
	}

	.step-2 {
		left: 67%;
		top: 47%;
		transform: translateX(-50%);
	}

	.step-3 {
		left: 30%;
		top: 83%;
		transform: translateX(-50%);
	}

	.step-text {
		font-family: var(--font-primary);
		color: var(--color-gold-light);
		font-size: clamp(0.8rem, 2vw, 4rem);
		text-align: center;
		text-shadow: var(--shadow-glow-gold);
		line-height: 1.4;
		margin: 0;
	}

	.big-firework {
		left: -46%;
		top: -25%;
		width: 100%;
		transform: rotate(-40deg);
		filter: blur(10px);
		opacity: 0.8;
	}

	.fireworks-decoration {
		right: -20%;
		left: auto;
		top: 45%;
		width: 50%;
	}

	/* ========== EVENTS & FAQ SECTION ========== */
	.events-faq-section {
		position: relative;
		margin-top: 21%;
		width: 100%;
		aspect-ratio: 2560 / 4257;
		overflow: hidden;
	}

	.events-content {
		position: relative;
		z-index: var(--z-raised);
		padding-top: 10%;
	}

	.events-title {
		width: 64%;
		max-width: 960px;
		margin: 0 auto;
		transform: rotate(-12deg);
	}

	.curved-text {
		width: 100%;
		height: auto;
		overflow: visible;
	}

	.curved-text text {
		font-family: var(--font-primary);
		font-weight: 400;
		font-style: italic;
		fill: var(--color-white);
		font-size: clamp(19px, 3.2vw, 38px);
	}

	.events-grid {
		position: relative;
		width: 100%;
		height: 40%;
	}

	.event-card-wrapper {
		position: absolute;
		margin-right: 10%;
	}

	.event-1 {
		left: -14%;
		top: 20%;
		width: 64.5%;
		z-index: 1;
	}

	.event-2 {
		left: 21%;
		top: 20%;
		width: 64.5%;
		z-index: 2;
	}

	.event-3 {
		left: 56%;
		top: 0%;
		width: 60%;
		z-index: 3;
	}

	/* ========== FAQ SECTION ========== */
	.faq-section {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 55%;
		z-index: var(--z-overlay);
	}

	.running-decoration {
		left: 3%;
		top: 0;
		width: 30%;
		z-index: var(--z-raised);
		transform: rotate(162deg) scaleY(-1);
	}

	.faq-title {
		position: absolute;
		top: 16%;
		left: 50%;
		transform: translateX(-50%);
		font-family: var(--font-primary);
		font-weight: 700;
		color: var(--color-white);
		font-size: clamp(3.2rem, 9.6vw, 15rem);
		text-align: center;
		margin: 0;
		z-index: var(--z-overlay);
	}

	.faq-content {
		position: absolute;
		top: 40%;
		left: 21%;
		width: 79%;
		height: 60%;
		display: flex;
		align-items: flex-start;
		z-index: var(--z-overlay);
	}

	.faq-list {
		background: var(--color-white);
		border-radius: var(--radius-pill);
		padding: 2.4rem 3.2rem;
		width: 46%;
		margin-top: -10%;
		margin-left: 14%;
	}

	.faq-item {
		padding: 1rem 0;
		text-align: center;
	}

	.faq-divider {
		width: 100%;
		height: auto;
		display: block;
	}

	.faq-question {
		font-family: var(--font-primary);
		font-weight: 600;
		color: var(--color-blue);
		font-size: clamp(0.8rem, 2.4vw, 4rem);
	}

	.stair-decoration {
		right: 3%;
		left: auto;
		top: -10%;
		width: 49%;
	}

	/* ========== RESPONSIVE ========== */
	@media (max-width: 1024px) {
		.event-1 {
			left: 5%;
			width: 35%;
		}

		.event-2 {
			left: 35%;
			width: 40%;
		}

		.event-3 {
			left: 60%;
			width: 40%;
		}
	}

	@media (max-width: 768px) {
		.fireworks-left,
		.fireworks-right {
			width: 50%;
		}

		.fireworks-right {
			left: auto;
			right: 0;
		}

		.hero-content {
			top: 60%;
		}

		.step {
			max-width: 60%;
		}

		.step-1,
		.step-2,
		.step-3 {
			left: 50%;
		}

		.step-1 {
			top: 15%;
		}

		.step-2 {
			top: 50%;
		}

		.step-3 {
			top: 80%;
		}

		.event-1,
		.event-2,
		.event-3 {
			position: relative;
			left: auto;
			top: auto;
			width: 80%;
			margin: 1rem auto;
		}

		.events-faq-section {
			aspect-ratio: auto;
			min-height: 200vh;
		}

		.faq-content {
			flex-direction: column;
			left: 5%;
			width: 90%;
		}

		.faq-list {
			width: 100%;
			border-radius: 32px;
			padding: 1.6rem;
		}

		.running-decoration,
		.stair-decoration {
			display: none;
		}
	}
</style>
