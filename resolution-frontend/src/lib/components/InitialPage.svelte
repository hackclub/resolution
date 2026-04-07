<script lang="ts">
	import type { Step, FAQ } from '$lib/types';
	import PlatformBackground from './PlatformBackground.svelte';

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

<PlatformBackground>
	<div class="page">
		<!-- HERO -->
		<section class="hero">
			<div class="eyebrow">
				<span class="dot"></span>
				<span>A Hack Club program · 8 weeks</span>
			</div>

			<h1 class="wordmark">
				<span class="word">Resolution</span>
			</h1>

			<p class="tagline">{heroDescription}</p>

			<div class="cta-row">
				<a href={ctaHref} class="cta">
					<span>{ctaText}</span>
					<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M5 12h14M13 5l7 7-7 7"/>
					</svg>
				</a>
				{#if showFaq}
					<a href="#faq" class="cta-ghost">Learn more</a>
				{/if}
			</div>

			<div class="hero-meta">
				<div class="meta-item"><strong>6</strong><span>pathways</span></div>
				<div class="meta-divider"></div>
				<div class="meta-item"><strong>8</strong><span>weeks</span></div>
				<div class="meta-divider"></div>
				<div class="meta-item"><strong>∞</strong><span>shipped</span></div>
			</div>
		</section>

		<!-- STEPS -->
		{#if showSteps && steps.length > 0}
			<section class="steps">
				<div class="section-head">
					<span class="kicker">How it works</span>
					<h2>Three steps. Eight weeks. One you.</h2>
				</div>
				<div class="steps-grid">
					{#each steps as step, i}
						<div class="step-card" style="--delay: {i * 80}ms">
							<div class="step-num">{String(i + 1).padStart(2, '0')}</div>
							<h3>{step.title}</h3>
							<p>{step.description}</p>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- FAQ -->
		{#if showFaq && faqs.length > 0}
			<section class="faq" id="faq">
				<div class="section-head">
					<span class="kicker">FAQ</span>
					<h2>Questions, answered.</h2>
				</div>
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
			</section>
		{/if}

		<footer class="foot">
			<span>© Resolution · Made by Hack Club</span>
		</footer>
	</div>
</PlatformBackground>

<style>
	.page {
		max-width: 1100px;
		margin: 0 auto;
		padding: 5rem 1.5rem 4rem;
	}

	/* ===== Hero ===== */
	.hero {
		text-align: center;
		padding: 4rem 0 6rem;
	}

	.eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.45rem 1rem;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		border-radius: var(--radius-pill);
		font-size: 0.82rem;
		color: var(--color-text-dim);
		backdrop-filter: blur(10px);
	}
	.dot {
		width: 7px; height: 7px; border-radius: 50%;
		background: var(--color-gold);
		box-shadow: 0 0 12px var(--color-gold);
	}

	.wordmark {
		font-family: var(--font-display);
		font-weight: 700;
		font-size: clamp(3.5rem, 11vw, 9rem);
		line-height: 0.95;
		margin: 1.8rem 0 1.2rem;
		letter-spacing: -0.04em;
	}
	.wordmark .word {
		background: var(--gradient-gold);
		background-clip: text;
		-webkit-background-clip: text;
		color: transparent;
		filter: drop-shadow(0 0 32px rgba(255, 214, 107, 0.35));
	}

	.tagline {
		max-width: 620px;
		margin: 0 auto;
		font-size: clamp(1.05rem, 1.5vw, 1.25rem);
		line-height: 1.6;
		color: var(--color-text-dim);
	}

	.cta-row {
		display: flex;
		gap: 0.8rem;
		justify-content: center;
		margin: 2.4rem 0 3rem;
		flex-wrap: wrap;
	}

	.cta {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		padding: 1rem 1.8rem;
		background: var(--gradient-gold);
		color: #1a1100;
		border-radius: var(--radius-pill);
		font-weight: 700;
		font-size: 1rem;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		box-shadow: var(--shadow-glow-gold);
		transition: transform var(--transition-normal), box-shadow var(--transition-normal);
	}
	.cta:hover {
		transform: translateY(-2px);
		box-shadow: 0 0 40px rgba(255, 214, 107, 0.7);
	}

	.cta-ghost {
		display: inline-flex;
		align-items: center;
		padding: 1rem 1.6rem;
		border: 1px solid var(--color-border-strong);
		background: var(--color-surface);
		color: var(--color-text);
		border-radius: var(--radius-pill);
		font-weight: 500;
		backdrop-filter: blur(10px);
		transition: background var(--transition-fast);
	}
	.cta-ghost:hover { background: var(--color-surface-2); }

	.hero-meta {
		display: inline-flex;
		align-items: center;
		gap: 1.6rem;
		padding: 1rem 1.8rem;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		backdrop-filter: blur(10px);
	}
	.meta-item {
		display: flex; flex-direction: column; align-items: center; gap: 0.1rem;
	}
	.meta-item strong {
		font-family: var(--font-display);
		font-size: 1.6rem;
		color: var(--color-gold);
	}
	.meta-item span {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}
	.meta-divider {
		width: 1px; height: 30px;
		background: var(--color-border);
	}

	/* ===== Section heads ===== */
	.section-head {
		text-align: center;
		margin-bottom: 3rem;
	}
	.kicker {
		display: inline-block;
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--color-gold);
		margin-bottom: 0.8rem;
	}
	.section-head h2 {
		font-family: var(--font-display);
		font-size: clamp(1.8rem, 4vw, 2.8rem);
		font-weight: 700;
		margin: 0;
		letter-spacing: -0.02em;
	}

	/* ===== Steps ===== */
	.steps {
		padding: 5rem 0;
	}
	.steps-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.2rem;
	}
	.step-card {
		padding: 2rem 1.6rem;
		background: var(--gradient-card);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		backdrop-filter: blur(10px);
		transition: transform var(--transition-normal), border-color var(--transition-normal);
	}
	.step-card:hover {
		transform: translateY(-4px);
		border-color: var(--color-gold);
	}
	.step-num {
		font-family: var(--font-display);
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-gold);
		letter-spacing: 0.1em;
		margin-bottom: 1rem;
	}
	.step-card h3 {
		font-family: var(--font-display);
		font-size: 1.4rem;
		margin: 0 0 0.6rem;
		color: var(--color-text);
	}
	.step-card p {
		margin: 0;
		color: var(--color-text-dim);
		line-height: 1.6;
		font-size: 0.95rem;
	}

	/* ===== FAQ ===== */
	.faq {
		padding: 5rem 0;
		max-width: 760px;
		margin: 0 auto;
	}
	.faq-list {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}
	.faq-item {
		text-align: left;
		width: 100%;
		padding: 1.2rem 1.5rem;
		background: var(--gradient-card);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--transition-fast);
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
		gap: 1rem;
		backdrop-filter: blur(10px);
	}
	.faq-item:hover { border-color: var(--color-border-strong); }
	.faq-item.open {
		border-color: var(--color-gold);
		background: rgba(255, 214, 107, 0.04);
	}
	.q {
		font-weight: 600;
		font-size: 1rem;
		color: var(--color-text);
	}
	.chev {
		font-size: 1.4rem;
		color: var(--color-gold);
		transition: transform var(--transition-fast);
	}
	.faq-item.open .chev { transform: rotate(45deg); }
	.a {
		grid-column: 1 / -1;
		margin: 0.6rem 0 0;
		color: var(--color-text-dim);
		line-height: 1.65;
		font-size: 0.95rem;
	}

	.foot {
		text-align: center;
		padding: 3rem 0 1rem;
		color: var(--color-text-muted);
		font-size: 0.85rem;
	}

	@media (max-width: 720px) {
		.steps-grid { grid-template-columns: 1fr; }
		.hero { padding: 2rem 0 4rem; }
		.page { padding-top: 3rem; }
	}
</style>
