<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	let submitting = $state(false);
	let qty = $state(1);
	const totalCost = $derived(data.item.costCurrency * qty);
	const canAfford = $derived(data.balance >= totalCost);
</script>

<svelte:head><title>{data.item.name} - Shop</title></svelte:head>

<div class="wrap">
	<a class="back" href="/app/pathway/{data.pathwayId.toLowerCase()}/shop">← Back to shop</a>
	<div class="card">
		{#if data.item.imageUrl}
			<img src={data.item.imageUrl} alt={data.item.name} class="hero" />
		{/if}
		<h1>{data.item.name}</h1>
		<p class="cost">{data.item.costCurrency} {data.shop.currencyName} each</p>
		<p class="desc">{data.item.description}</p>

		<form
			method="POST"
			action="?/purchase"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
		>
			<input type="hidden" name="itemId" value={data.item.id} />

			<label>
				Quantity
				<input type="number" name="quantity" min="1" max="10" bind:value={qty} required />
			</label>

			<h2>Shipping address</h2>
			<div class="grid2">
				<label>First name<input name="firstName" required /></label>
				<label>Last name<input name="lastName" required /></label>
			</div>
			<label>Email<input name="email" type="email" required /></label>
			<label>Phone (optional)<input name="phone" /></label>
			<label>Address line 1<input name="addressLine1" required /></label>
			<label>Address line 2<input name="addressLine2" /></label>
			<div class="grid2">
				<label>City<input name="city" required /></label>
				<label>State / Province<input name="stateProvince" required /></label>
			</div>
			<div class="grid2">
				<label>Postal code<input name="postalCode" /></label>
				<label>Country<input name="country" required /></label>
			</div>

			<div class="summary">
				Total: <strong>{totalCost} {data.shop.currencyName}</strong>
				· Balance: {data.balance}
			</div>

			{#if form?.error}
				<p class="error">{form.error}</p>
			{/if}

			<button type="submit" disabled={submitting || !canAfford}>
				{submitting ? 'Purchasing…' : canAfford ? 'Purchase' : 'Insufficient balance'}
			</button>
		</form>
	</div>
</div>

<style>
	.wrap { max-width: 700px; margin: 0 auto; padding: 2rem; font-family: 'Kodchasan', sans-serif; }
	.back { color: #8492a6; text-decoration: none; }
	.card { background: white; border: 2px solid #8492a6; border-radius: 16px; padding: 2rem; margin-top: 1rem; }
	.hero { width: 100%; max-height: 320px; object-fit: cover; border-radius: 12px; margin-bottom: 1rem; }
	.cost { color: #af98ff; font-weight: 600; }
	.desc { white-space: pre-wrap; color: #4a4a5e; }
	form { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem; }
	label { display: flex; flex-direction: column; font-size: 0.85rem; color: #4a4a5e; gap: 0.25rem; }
	input { padding: 0.5rem; border: 1px solid #8492a6; border-radius: 6px; font: inherit; }
	.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
	h2 { font-size: 1rem; margin: 1rem 0 0; }
	.summary { padding: 0.75rem; background: #f4f4f8; border-radius: 8px; }
	.error { color: #ec3750; }
	button {
		padding: 0.75rem; background: #af98ff; color: white;
		border: none; border-radius: 8px; font-weight: 600; cursor: pointer;
	}
	button:disabled { background: #c9c9d4; cursor: not-allowed; }
</style>
