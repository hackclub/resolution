<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import PlatformBackground from '$lib/components/PlatformBackground.svelte';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const canAfford = $derived(data.balance >= data.item.price);
	const inStock = $derived(data.item.stock === null || data.item.stock > 0);
	const currencyLabel = $derived(
		data.item.price === 1 ? data.shop.currencyName : data.shop.currencyNamePlural
	);

	let isSubmitting = $state(false);

	// prefill from week-submission flow style: name + email come from session user
	let firstName = $state(data.user.firstName);
	let lastName = $state(data.user.lastName);
	let email = $state(data.user.email);

	// shipping address (only used for physical items)
	let addressLine1 = $state('');
	let addressLine2 = $state('');
	let city = $state('');
	let stateProvince = $state('');
	let country = $state('');
	let zipPostalCode = $state('');

	// optional user notes for the fulfiller
	let userNotes = $state('');
</script>

<svelte:head>
	<title>{data.item.name} - Shop - Resolution</title>
</svelte:head>

<PlatformBackground>
	<div class="page">
		<a href="/app/pathway/{data.pathwayId.toLowerCase()}/shop" class="back-link">
			<img src="https://icons.hackclub.com/api/icons/8492a6/back" alt="Back" width="20" height="20" />
			Back to shop
		</a>

		{#if form?.success}
			<div class="success-card">
				<h1>Order placed!</h1>
				<p>
					Your order for <strong>{data.item.name}</strong> has been received.
					We'll get it to you as soon as we can.
				</p>
				<a href="/app/pathway/{data.pathwayId.toLowerCase()}/shop" class="primary-btn">
					Back to shop
				</a>
			</div>
		{:else}
			<form method="POST" action="?/buy" class="card" use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
					isSubmitting = false;
				};
			}}>
				<div class="form-area">
					<header>
						<span class="badge">
							{data.item.itemType === 'PHYSICAL' ? 'Physical item' : 'Digital item'}
						</span>
						<h1>Complete your order</h1>
						<p class="subtitle">{data.item.description}</p>
					</header>

					{#if form && !form.success && 'message' in form}
						<div class="error-message">{form.message}</div>
					{/if}

					{#if !canAfford}
						<div class="error-message">
							You don't have enough {data.shop.currencyNamePlural}. You need
							{data.item.price - data.balance} more.
						</div>
					{/if}

					{#if !inStock}
						<div class="error-message">This item is out of stock.</div>
					{/if}

					<section class="form-section">
						<h2>Your details</h2>
						<div class="form-row">
							<div class="form-group">
								<label for="firstName">First name</label>
								<input id="firstName" name="firstName" type="text" bind:value={firstName} required maxlength="100" />
							</div>
							<div class="form-group">
								<label for="lastName">Last name</label>
								<input id="lastName" name="lastName" type="text" bind:value={lastName} required maxlength="100" />
							</div>
						</div>
						<div class="form-group">
							<label for="email">Email</label>
							<input id="email" name="email" type="email" bind:value={email} required maxlength="254" />
						</div>
					</section>

					<section class="form-section">
						<h2>Shipping address</h2>
						<p class="section-hint">Where should we send this?</p>

						<div class="form-group">
							<label for="addressLine1">Address line 1</label>
							<input id="addressLine1" name="addressLine1" type="text" bind:value={addressLine1} required maxlength="200" placeholder="123 Main St" />
						</div>

						<div class="form-group">
							<label for="addressLine2">Address line 2 <span class="optional">(optional)</span></label>
							<input id="addressLine2" name="addressLine2" type="text" bind:value={addressLine2} maxlength="200" placeholder="Apt 4B" />
						</div>

						<div class="form-row">
							<div class="form-group">
								<label for="city">City</label>
								<input id="city" name="city" type="text" bind:value={city} required maxlength="100" />
							</div>
							<div class="form-group">
								<label for="stateProvince">State / Province</label>
								<input id="stateProvince" name="stateProvince" type="text" bind:value={stateProvince} required maxlength="100" />
							</div>
						</div>

						<div class="form-row">
							<div class="form-group">
								<label for="country">Country</label>
								<input id="country" name="country" type="text" bind:value={country} required maxlength="100" />
							</div>
							<div class="form-group">
								<label for="zipPostalCode">ZIP / Postal code</label>
								<input id="zipPostalCode" name="zipPostalCode" type="text" bind:value={zipPostalCode} required maxlength="20" />
							</div>
						</div>
					</section>

					<section class="form-section last">
						<h2>Notes <span class="optional">(optional)</span></h2>
						<p class="section-hint">Anything the fulfiller should know? (size, color, etc.)</p>
						<div class="form-group">
							<textarea id="userNotes" name="userNotes" bind:value={userNotes} maxlength="500" rows="3" placeholder="e.g. size M please"></textarea>
						</div>
					</section>
				</div>

				<footer class="order-bar">
					<div class="item-thumb">
						{#if data.item.itemImageUrl}
							<img src={data.item.itemImageUrl} alt={data.item.name} />
						{:else}
							<div class="thumb-placeholder">No image</div>
						{/if}
					</div>

					<div class="item-meta">
						<div class="item-name">{data.item.name}</div>
						<div class="item-price">
							{data.item.price} {currencyLabel}
						</div>
						<div class="balance">
							You have {data.balance} {data.shop.currencyNamePlural}
						</div>
					</div>

					<button
						type="submit"
						class="primary-btn complete-btn"
						disabled={isSubmitting || !canAfford || !inStock}
					>
						{isSubmitting ? 'Placing order…' : 'Complete order'}
					</button>
				</footer>
			</form>
		{/if}
	</div>
</PlatformBackground>

<style>
	.page {
		min-height: 100vh;
		padding: 2rem;
		max-width: 900px;
		margin: 0 auto;
		color: #1a1a2e;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: #8492a6;
		text-decoration: none;
		font-size: 0.9rem;
		margin-bottom: 1.5rem;
	}

	.back-link:hover {
		color: #1a1a2e;
	}

	.card {
		background: rgba(255, 255, 255, 0.95);
		border: 1px solid #af98ff;
		border-radius: 16px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.form-area {
		padding: 2.5rem;
	}

	header {
		margin-bottom: 1.5rem;
		padding-bottom: 1.25rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
		background: #af98ff;
		margin-bottom: 0.75rem;
	}

	h1 {
		font-size: 1.75rem;
		margin: 0;
		line-height: 1.3;
	}

	.subtitle {
		color: #8492a6;
		margin: 0.5rem 0 0 0;
	}

	.form-section {
		margin-bottom: 1.5rem;
		padding-bottom: 1.25rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.form-section.last {
		border-bottom: none;
		margin-bottom: 0;
		padding-bottom: 0;
	}

	.form-section h2 {
		font-size: 1.1rem;
		margin: 0 0 0.25rem 0;
	}

	.section-hint {
		color: #8492a6;
		font-size: 0.875rem;
		margin: 0 0 1rem 0;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	label {
		display: block;
		font-size: 0.875rem;
		font-weight: 600;
		color: #1a1a2e;
		margin-bottom: 0.375rem;
	}

	.optional {
		font-weight: 400;
		color: #8492a6;
	}

	input[type='text'],
	input[type='email'],
	textarea {
		width: 100%;
		padding: 0.625rem 0.75rem;
		border: 1px solid #d0d5dd;
		border-radius: 8px;
		font-size: 0.9rem;
		font-family: 'Kodchasan', sans-serif;
		color: #1a1a2e;
		background: white;
		box-sizing: border-box;
	}

	input:focus,
	textarea:focus {
		outline: none;
		border-color: #af98ff;
	}

	textarea {
		resize: vertical;
	}

	.error-message {
		background: #fef2f2;
		color: #ec3750;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		border: 1px solid #fecaca;
		font-size: 0.9rem;
		margin-bottom: 1.25rem;
	}

	.order-bar {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 1.5rem;
		padding: 1.25rem 2rem;
		border-top: 1px solid #e0e0e0;
		background: #fafafa;
	}

	.item-thumb {
		width: 72px;
		height: 72px;
		border-radius: 12px;
		border: 1px solid #e0e0e0;
		overflow: hidden;
		background: white;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.item-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.thumb-placeholder {
		font-size: 0.7rem;
		color: #8492a6;
		text-align: center;
		padding: 0 0.25rem;
	}

	.item-name {
		font-weight: 600;
		font-size: 1rem;
	}

	.item-price {
		color: #1a1a2e;
		font-size: 0.95rem;
		margin-top: 0.125rem;
	}

	.balance {
		color: #8492a6;
		font-size: 0.8rem;
		margin-top: 0.25rem;
	}

	.primary-btn {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		background: #33d6a6;
		border: 1px solid #33d6a6;
		color: white;
		font-size: 0.95rem;
		font-weight: 600;
		border-radius: 12px;
		cursor: pointer;
		font-family: 'Kodchasan', sans-serif;
		text-decoration: none;
	}

	.primary-btn:hover:not(:disabled) {
		background: #2bc299;
	}

	.primary-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.complete-btn {
		min-width: 160px;
	}

	.success-card {
		background: rgba(255, 255, 255, 0.95);
		border: 1px solid #33d6a6;
		border-radius: 16px;
		padding: 3rem;
		text-align: center;
	}

	.success-card h1 {
		color: #33d6a6;
		margin-bottom: 0.5rem;
	}

	.success-card p {
		color: #8492a6;
		margin-bottom: 2rem;
	}

	@media (max-width: 768px) {
		.page {
			padding: 1rem;
		}

		.form-area {
			padding: 1.5rem;
		}

		.form-row {
			grid-template-columns: 1fr;
		}

		.order-bar {
			grid-template-columns: auto 1fr;
			padding: 1rem 1.25rem;
		}

		.complete-btn {
			grid-column: 1 / -1;
			width: 100%;
		}
	}
</style>
