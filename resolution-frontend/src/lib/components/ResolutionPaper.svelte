<script lang="ts">
	import DOMPurify from 'dompurify';
	import type { Snippet } from 'svelte';

	interface Props {
		visible?: boolean;
		children?: Snippet;
		text?: string;
		onSuccess?: () => void;
	}

	let { visible = false, children, text = '', onSuccess }: Props = $props();

	let submitted = $state(false);
	let error = $state('');
	let isSubmitting = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (isSubmitting) return;

		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);
		const rawEmail = formData.get('email') as string;
		const cleanEmail = DOMPurify.sanitize(rawEmail.trim()).slice(0, 254);

		error = '';

		if (!cleanEmail) {
			error = 'Please enter your email';
			return;
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(cleanEmail)) {
			error = 'Please enter a valid email';
			return;
		}

		isSubmitting = true;

		try {
			const res = await fetch('/api/submit-resolution', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: cleanEmail })
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || 'Submission failed');
			}

			console.log('Email submitted:', cleanEmail);
			submitted = true;
			onSuccess?.();
		} catch (err: unknown) {
			console.error(err);
			error = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="resolution-paper" class:visible>
	<div class="paper-content">
		{#if children}
			{@render children()}
		{:else if text}
			<p class="paper-text">{text}</p>
		{:else if submitted}
			<div class="success-message">
				<p class="success-text">You're in!</p>
				<p class="success-subtext">Check your email for next steps.</p>
			</div>
		{:else}
			<p class="paper-subtitle">Stake your claim. Join the challenge.</p>

			<form class="signup-form" onsubmit={handleSubmit}>
				<div class="input-wrapper">
					<input
						type="email"
						name="email"
						placeholder="your@email.com"
						class="email-input"
						required
					/>
					<button type="submit" class="submit-btn" disabled={isSubmitting}>
						{#if isSubmitting}
							...
						{:else}
							→
						{/if}
					</button>
				</div>
				{#if error}
					<p class="error-text">{error}</p>
				{/if}
			</form>
		{/if}
	</div>
</div>

<style>
	.resolution-paper {
		position: absolute;
		inset: 0;
		background-image: url('$lib/assets/resolution_paper.png');
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
		display: flex;
		justify-content: center;
		align-items: center;
		transform: translateY(100%) translateZ(0);
		will-change: transform;
		backface-visibility: hidden;
		transition: transform var(--transition-slow);
	}

	.resolution-paper.visible {
		transform: translateY(0) translateZ(0);
	}

	.paper-content {
		position: absolute;
		top: 38%;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.2rem;
		padding: 0.8rem;
		width: 28%;
		height: 40%;
		overflow-y: auto;
	}

	.paper-subtitle {
		font-family: var(--font-handwritten);
		font-size: 1.2rem;
		color: var(--color-paper);
		margin: 0;
		text-align: center;
		font-weight: normal;
	}

	.paper-text {
		font-family: var(--font-handwritten);
		font-size: 1.2rem;
		color: var(--color-paper);
		margin: 0;
		text-align: center;
		line-height: 1.4;
	}

	.signup-form {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.8rem;
	}

	.input-wrapper {
		display: flex;
		background: var(--color-white);
		border: 2px solid var(--color-paper);
		border-radius: var(--radius-sm);
		overflow: hidden;
		box-shadow: var(--shadow-input);
		width: 100%;
	}

	.input-wrapper:focus-within {
		border-color: var(--color-pink);
		box-shadow: var(--shadow-input-focus);
	}

	.email-input {
		flex: 1;
		font-family: var(--font-handwritten);
		font-size: 1rem;
		padding: 0.6rem 1rem;
		border: none;
		background: transparent;
		color: #333;
		outline: none;
	}

	.email-input::placeholder {
		color: var(--color-text-muted);
	}

	.submit-btn {
		font-family: var(--font-handwritten);
		font-size: 1.2rem;
		padding: 0.6rem 1.2rem;
		background: var(--color-gold);
		border: none;
		border-left: 2px solid var(--color-paper);
		color: var(--color-paper);
		cursor: pointer;
		transition: background var(--transition-fast);
	}

	.submit-btn:hover:not(:disabled) {
		background: #ffd93d;
	}

	.submit-btn:active:not(:disabled) {
		background: #ffcc00;
	}

	.submit-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.error-text {
		font-family: var(--font-handwritten);
		font-size: 0.8rem;
		color: var(--color-error);
		margin: 0;
		text-align: center;
	}

	.success-message {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
	}

	.success-text {
		font-family: var(--font-handwritten);
		font-size: 2rem;
		color: var(--color-green);
		margin: 0;
	}

	.success-subtext {
		font-family: var(--font-handwritten);
		font-size: 1rem;
		color: var(--color-paper-light);
		margin: 0;
	}

	@media (max-width: 480px) {
		.paper-content {
			width: 52%;
			height: 40%;
			top: 38%;
			left: 50%;
		}

		.paper-subtitle {
			font-size: 0.9rem;
		}

		.email-input {
			font-size: 0.8rem;
			padding: 0.5rem 0.8rem;
		}

		.submit-btn {
			font-size: 1rem;
			padding: 0.5rem 1rem;
		}
	}
</style>
