<script lang="ts">
	import type { Step, FAQ } from '$lib/types';
	import heroBg from '$lib/assets/hero_bg.png';
	import darkBg from '$lib/assets/dark_bg.png';
	import swirlBg from '$lib/assets/swirl_overlay.png';
	import lightBlueBg from '$lib/assets/light_blue_bg.png';
	import fireworks from '$lib/assets/firework_burst.png';
	import fireworksGif from '$lib/assets/fireworks_gif.png';
	import sparklyBorder from '$lib/assets/gold_glitter_border.png';
	import vectorLine from '$lib/assets/vector_divider.svg';


	interface Props {
		heroDescription?: string;
		ctaText?: string;
		ctaHref?: string;
		steps?: Step[];
		faqs?: FAQ[];
		showSteps?: boolean;
		showFaq?: boolean;
	}

	let {
		heroDescription = "Ship every week. Earn prizes. Most people quit. Will you be different?",
		ctaText = "I'M INSPIRED",
		ctaHref = "/rsvp",
		steps = [
			{ title: "Step 1", description: "asfdskfhsdsdfasdfsdafdsdsfasdfsdaf" },
			{ title: "Step 2", description: "asfdskfhsdsdfasdfsdafdsdsfasdfsdaf" },
			{ title: "Step 3", description: "asfdskfhsdsdfasdfsdafdsdsfasdfsdaf" }
		],
		faqs = [
			{ question: "Question 1" },
			{ question: "Question 2" },
			{ question: "Question 3" },
			{ question: "Question 4" },
			{ question: "Question 5" }
		],
		showSteps = false,
		showFaq = false
	}: Props = $props();

	let openFaqIndex = $state<number | null>(null);

	function toggleFaq(index: number) {
		if (openFaqIndex === index) {
			openFaqIndex = null;
		} else {
			openFaqIndex = index;
		}
	}
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

			<div class="hero-buttons">
				<a href={ctaHref} class="cta-button full-width">
					<span>{ctaText}</span>
				</a>
			</div>
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
					<p class="step-text">{steps[0]?.title}:<br/>{steps[0]?.description}</p>
				</div>

				<div class="step step-2">
					<p class="step-text">{steps[1]?.title}:<br/>{steps[1]?.description}</p>
				</div>

				<div class="step step-3">
					<p class="step-text">{steps[2]?.title}:<br/>{steps[2]?.description}</p>
				</div>
			</div>
		</section>
	{/if}

	<!-- EVENTS & FAQ SECTION -->
	{#if showFaq}
		<section class="events-faq-section">
			<img src={lightBlueBg} alt="" class="section-bg" />
			
				<div class="faq-section">


					<h2 class="faq-title">FAQ</h2>

					<div class="faq-content">
						<div class="faq-list">
							{#each faqs as faq, i}
								<button 
									class="faq-item" 
									class:is-open={openFaqIndex === i}
									onclick={() => toggleFaq(i)}
								>
									<div class="faq-header">
										<span class="faq-question">{faq.question}</span>
										<span class="faq-chevron">{openFaqIndex === i ? '▲' : '▼'}</span>
									</div>
									{#if openFaqIndex === i && faq.answer}
										<div class="faq-answer">
											<p>{faq.answer}</p>
										</div>
									{/if}
								</button>
								{#if i < faqs.length - 1}
									<img src={vectorLine} alt="" class="faq-divider" />
								{/if}
							{/each}
						</div>

					</div>
				</div>
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
		top: 55%;
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

	.hero-buttons {
		display: flex;
		gap: 1rem;
	}

	.hero-description {
		font-family: var(--font-primary);
		font-weight: 400;
		color: var(--color-gold);
		font-size: 1.2rem;
		text-align: center;
		text-shadow: var(--shadow-glow-gold);
		line-height: 1.5;
		margin: 0;
	}

	.cta-button {
		background: var(--color-cta-bg);
		border: 3px solid var(--color-cta-border);
		border-radius: var(--radius-button);
		padding: 0.75rem 1.75rem;
		text-decoration: none;
		transition: all var(--transition-normal);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 48px;
	}

	.cta-button:hover {
		background: var(--color-cta-hover);
		transform: scale(1.05);
	}

	.cta-button span {
		color: var(--color-cta-text);
		font-size: clamp(1rem, 0.9rem + 0.5vw, 1.5rem);
		font-weight: 500;
		white-space: nowrap;
	}

	.cta-button.full-width {
		width: 100%;
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
		max-width: 30%;
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
		font-size: clamp(1.1rem, 1rem + 1vw, 2.25rem);
		text-align: center;
		text-shadow: var(--shadow-glow-gold);
		line-height: 1.35;
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

	/* ========== FAQ SECTION ========== */
	.faq-section {
		position: absolute;
		top: 10%;
		left: 0;
		right: 0;
		height: 55%;
		z-index: var(--z-overlay);
	}

	

	.faq-title {
		position: absolute;
		top: 8%;
		left: 50%;
		transform: translateX(-50%);
		font-family: var(--font-primary);
		font-weight: 700;
		color: var(--color-white);
		font-size: clamp(3rem, 8vw, 12rem);
		text-align: center;
		margin: 0;
		z-index: var(--z-overlay);
	}

	.faq-content {
		position: absolute;
		top: 32%;
		left: 50%;
		transform: translateX(-50%);
		width: 90%;
		max-width: 900px;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		z-index: var(--z-overlay);
	}

	.faq-list {
		background: var(--color-white);
		border-radius: clamp(2rem, 5vw, 7.8rem);
		padding: clamp(1.5rem, 3vw, 3rem) clamp(2rem, 4vw, 4rem);
		width: 100%;
		max-width: 700px;
	}

	.faq-item {
		width: 100%;
		padding: clamp(0.75rem, 1.5vw, 1.25rem) 0;
		text-align: center;
		background: transparent;
		border: none;
		cursor: pointer;
		font-family: inherit;
		transition: all 0.2s ease;
	}

	.faq-item:hover {
		background: rgba(145, 200, 255, 0.08);
		border-radius: 1rem;
	}

	.faq-item.is-open {
		background: rgba(145, 200, 255, 0.12);
		border-radius: 1rem;
		padding: clamp(0.75rem, 1.5vw, 1.25rem);
	}

	.faq-header {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
	}

	.faq-chevron {
		font-size: clamp(0.75rem, 1vw, 1rem);
		color: var(--color-blue);
		opacity: 0.6;
		transition: transform 0.2s ease;
	}

	.faq-item.is-open .faq-chevron {
		opacity: 1;
	}

	.faq-answer {
		margin-top: 1rem;
		padding: 0 1rem;
		animation: slideDown 0.3s ease;
	}

	.faq-answer p {
		font-family: var(--font-primary);
		font-weight: 400;
		color: #5a5a7a;
		font-size: clamp(0.9rem, 1.2vw + 0.3rem, 1.25rem);
		line-height: 1.6;
		margin: 0;
		text-align: center;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.faq-divider {
		width: 100%;
		height: 1px;
		display: block;
		opacity: 0.8;
	}

	.faq-question {
		font-family: var(--font-primary);
		font-weight: 600;
		color: var(--color-blue);
		font-size: clamp(1rem, 1.5vw + 0.5rem, 2rem);
		word-break: break-word;
	}

	
	/* ========== RESPONSIVE ========== */
	@media (max-width: 480px) {
		.hero-buttons {
			flex-direction: column;
			width: 100%;
			gap: 0.75rem;
		}

		.cta-button {
			width: 100%;
			text-align: center;
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
			top: 55%;
			max-width: 90%;
		}

		.step {
			max-width: 70%;
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

		.events-faq-section {
			aspect-ratio: auto;
			min-height: 180vh;
		}

		.faq-content {
			flex-direction: column;
			left: 5%;
			width: 90%;
		}

		.faq-list {
			width: 100%;
			border-radius: 32px;
			padding: 1.5rem;
			margin-left: 0;
		}

	}
</style>
