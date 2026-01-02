<script lang="ts">
	import DOMPurify from "dompurify";

	let { visible = false, children, text = "" } = $props();

	let submitted = $state(false);
	let error = $state("");
	let isSubmitting = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (isSubmitting) return;

		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);
		const rawEmail = formData.get("email") as string;
		const cleanEmail = DOMPurify.sanitize(rawEmail.trim()).slice(0, 254);

		error = "";

		if (!cleanEmail) {
			error = "Please enter your email";
			return;
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(cleanEmail)) {
			error = "Please enter a valid email";
			return;
		}

		isSubmitting = true;

		try {
			const res = await fetch("/api/submit-resolution", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: cleanEmail }),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Submission failed");
			}

			console.log("Email submitted:", cleanEmail);
			submitted = true;
		} catch (err: any) {
			console.error(err);
			error = err.message || "Something went wrong. Please try again.";
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
					<button
						type="submit"
						class="submit-btn"
						disabled={isSubmitting}
					>
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
		background-image: url("$lib/assets/resolution_paper.png");
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
		display: flex;
		justify-content: center;
		align-items: center;
		transform: translateY(100%) translateZ(0);
		will-change: transform;
		backface-visibility: hidden;
		transition: transform 0.8s ease-out;
	}

	.resolution-paper.visible {
		transform: translateY(0) translateZ(0);
	}

	.paper-content {
		position: absolute;
		/* Area covering the blank space efficiently */
		top: 38%;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		padding: 1rem;
		/* Area of the notepad paper */
		width: 35%;
		height: 50%;
		overflow-y: auto;
		/* Optional: for debugging the border */
		/* border: 2px dashed rgba(0,0,0,0.1); */
	}

	.paper-subtitle {
		font-family: "Patrick Hand", cursive;
		font-size: 1.5rem;
		color: #5a5247;
		margin: 0;
		text-align: center;
		font-weight: normal;
	}

	.paper-text {
		font-family: "Patrick Hand", cursive;
		font-size: 1.5rem;
		color: #5a5247;
		margin: 0;
		text-align: center;
		line-height: 1.4;
	}

	.signup-form {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.input-wrapper {
		display: flex;
		background: white;
		border: 2px solid #5a5247;
		border-radius: 4px; /* More of a paper-like feel than pill-shaped */
		overflow: hidden;
		box-shadow: 2px 2px 0 0 #5a5247;
		width: 100%;
	}

	.input-wrapper:focus-within {
		border-color: #e472ab;
		box-shadow: 2px 2px 0 0 #e472ab;
	}

	.email-input {
		flex: 1;
		font-family: "Patrick Hand", cursive;
		font-size: 1.25rem;
		padding: 0.75rem 1.25rem;
		border: none;
		background: transparent;
		color: #333;
		outline: none;
	}

	.email-input::placeholder {
		color: #aaa;
	}

	.email-input.error {
		color: #c44;
	}

	.submit-btn {
		font-family: "Patrick Hand", cursive;
		font-size: 1.5rem;
		padding: 0.75rem 1.5rem;
		background: #ffe475;
		border: none;
		border-left: 2px solid #5a5247;
		color: #5a5247;
		cursor: pointer;
		transition: background 0.2s;
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
		font-family: "Patrick Hand", cursive;
		font-size: 1rem;
		color: #c44;
		margin: 0;
		text-align: center;
	}

	.success-message {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.success-text {
		font-family: "Patrick Hand", cursive;
		font-size: 2.5rem;
		color: #4a7c59;
		margin: 0;
	}

	.success-subtext {
		font-family: "Patrick Hand", cursive;
		font-size: 1.2rem;
		color: #7a7060;
		margin: 0;
	}

	@media (max-width: 480px) {
		.paper-content {
			width: 65%;
			height: 50%;
			top: 38%;
			left: 50%;
		}
		.paper-title {
			font-size: 2.5rem;
		}

		.paper-subtitle {
			font-size: 1.1rem;
		}

		.email-input {
			font-size: 1rem;
			padding: 0.6rem 1rem;
		}

		.submit-btn {
			font-size: 1.25rem;
			padding: 0.6rem 1.25rem;
		}
	}
</style>
