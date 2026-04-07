<script lang="ts">
	import type { Step, FAQ } from '$lib/types';
	import heroBg from '$lib/assets/hero_bg.png';
	import lightBlueBg from '$lib/assets/light_blue_bg.png';

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
		heroDescription = 'Ship every week. Earn prizes. Most people quit. Will you be different?',
		ctaText = "I'M INSPIRED",
		ctaHref = '/rsvp',
		steps = [],
		faqs = [],
		showSteps = false,
		showFaq = false
	}: Props = $props();

	let openFaqIndex = $state<number | null>(null);

	function toggleFaq(index: number) {
		openFaqIndex = openFaqIndex === index ? null : index;
	}
</script>

<div class="page">
	<!-- HERO -->
	<section class="hero">
		<img src={heroBg} alt="Resolution" class="hero-bg" />
		<div class="hero-fade"></div>

		<div class="hero-content">
			<p class="tagline">{heroDescription}</p>
			<a href={ctaHref} class="cta">{ctaText}</a>
		</div>
	</section>

	<!-- STEPS -->
	{#if showSteps && steps.length > 0}
		<section class="steps">
			<div class="container">
				<h2>How it works</h2>
				<div class="steps-grid">
					{#each steps as step, i}
						<div class="step-card">
							<span class="step-num">{i + 1}</span>
							<h3>{step.title}</h3>
							<p>{step.description}</p>
						</div>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	<!-- FAQ -->
	{#if showFaq && faqs.length > 0}
		<section class="faq" id="faq">
			<img src={lightBlueBg} alt="" class="faq-bg" />
			<div class="container faq-container">
				<h2>Frequently asked</h2>
				<div class="faq-list">
					{#each faqs as faq, i}
						<button
							type="button"
							class="faq-item"
							class:open={openFaqIndex === i}
							onclick={() => toggleFaq(i)}
						>
							<span class="q">{faq.question}</span>
							<span class="chev" aria-hidden="true">+</span>
							{#if openFaqIndex === i && faq.answer}
								<p class="a">{faq.answer}</p>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		</section>
	{/if}

	<footer class="foot">© Resolution · Hack Club</footer>
</div>

<style>
	.page {
		width: 100%;
		overflow-x: hidden;
		font-family: var(--font-primary);
		background: #0a0820;
		color: var(--color-text);
	}

	h2 {
		font-family: var(--font-display);
		font-size: clamp(1.6rem, 3vw, 2.2rem);
		font-weight: 600;
		margin: 0 0 2.5rem;
		letter-spacing: -0.02em;
	}

	.container {
		max-width: 960px;
		margin: 0 auto;
		padding: 0 1.5rem;
	}

	/* ========== HERO ========== */
	.hero {
		position: relative;
		width: 100%;
		min-height: 100vh;
		overflow: hidden;
		display: flex;
		align-items: flex-end;
		justify-content: center;
	}
	.hero-bg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
		z-index: 0;
	}
	.hero-fade {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, transparent 50%, rgba(10, 8, 32, 0.7) 85%, #0a0820 100%);
		z-index: 1;
		pointer-events: none;
	}
	.hero-content {
		position: relative;
		z-index: 2;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
		padding: 0 1.5rem 5rem;
		max-width: 620px;
		text-align: center;
	}
	.tagline {
		margin: 0;
		font-size: clamp(1.05rem, 1.4vw, 1.2rem);
		line-height: 1.6;
		color: #ffe9a8;
		text-shadow: 0 2px 24px rgba(0, 0, 0, 0.8);
	}
	.cta {
		display: inline-block;
		padding: 0.95rem 2.2rem;
		background: var(--color-gold);
		color: #1a1100;
		border-radius: var(--radius-pill);
		font-weight: 600;
		font-size: 0.95rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		text-decoration: none;
		transition: transform var(--transition-fast), background var(--transition-fast);
	}
	.cta:hover {
		transform: translateY(-2px);
		background: var(--color-gold-light);
	}

	/* ========== STEPS ========== */
	.steps {
		padding: 6rem 0;
		background: #0a0820;
	}
	.steps-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.25rem;
	}
	.step-card {
		padding: 2rem;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: var(--radius-md);
		transition: border-color var(--transition-fast);
	}
	.step-card:hover { border-color: rgba(255, 214, 107, 0.4); }
	.step-num {
		display: inline-block;
		font-family: var(--font-display);
		font-size: 0.85rem;
		color: var(--color-gold);
		margin-bottom: 0.9rem;
	}
	.step-card h3 {
		font-family: var(--font-display);
		font-size: 1.2rem;
		font-weight: 600;
		margin: 0 0 0.5rem;
		color: var(--color-text);
	}
	.step-card p {
		margin: 0;
		color: var(--color-text-dim);
		line-height: 1.6;
		font-size: 0.94rem;
	}

	/* ========== FAQ ========== */
	.faq {
		position: relative;
		padding: 6rem 0;
		overflow: hidden;
	}
	.faq-bg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		z-index: 0;
	}
	.faq-container {
		position: relative;
		z-index: 1;
		max-width: 720px;
	}
	.faq h2 { color: #1a1a3a; }
	.faq-list {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.faq-item {
		text-align: left;
		width: 100%;
		padding: 1.15rem 1.4rem;
		background: rgba(255, 255, 255, 0.92);
		border: 1px solid rgba(255, 255, 255, 0.6);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--transition-fast);
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: 1rem;
	}
	.faq-item:hover { background: #fff; }
	.faq-item.open { background: #fff; }
	.q {
		font-weight: 600;
		font-size: 1rem;
		color: #1a1a3a;
	}
	.chev {
		font-size: 1.4rem;
		color: #6a4ac9;
		font-weight: 300;
		transition: transform var(--transition-fast);
	}
	.faq-item.open .chev { transform: rotate(45deg); }
	.a {
		grid-column: 1 / -1;
		margin: 0.5rem 0 0;
		color: #4a4a6a;
		line-height: 1.6;
		font-size: 0.94rem;
	}

	.foot {
		text-align: center;
		padding: 2rem 1rem;
		color: var(--color-text-muted);
		font-size: 0.82rem;
		background: #0a0820;
	}

	@media (max-width: 720px) {
		.steps-grid { grid-template-columns: 1fr; }
		.steps, .faq { padding: 4rem 0; }
	}
</style>
