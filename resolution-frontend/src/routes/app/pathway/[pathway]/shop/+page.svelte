<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>{data.shop.currencyName} Shop - Resolution</title></svelte:head>

<div class="shop-container">
	<div class="header">
		<a class="back" href="/app/pathway/{data.pathwayId.toLowerCase()}">← Back</a>
		<h1>Shop</h1>
		<div class="balance-pill">
			{#if data.shop.currencyIconUrl}
				<img src={data.shop.currencyIconUrl} alt="" width="20" height="20" />
			{/if}
			<strong>{data.balance}</strong>
			<span>{data.shop.currencyName}</span>
		</div>
	</div>

	<p class="orders-link">
		<a href="/app/pathway/{data.pathwayId.toLowerCase()}/shop/orders">My orders →</a>
	</p>

	{#if data.items.length === 0}
		<p class="empty">No items in the shop yet. Check back soon!</p>
	{:else}
		<div class="grid">
			{#each data.items as item}
				<a class="item-card" href="/app/pathway/{data.pathwayId.toLowerCase()}/shop/{item.id}">
					{#if item.imageUrl}
						<img src={item.imageUrl} alt={item.name} class="item-img" />
					{:else}
						<div class="item-img placeholder">No image</div>
					{/if}
					<h3>{item.name}</h3>
					<p class="cost">{item.costCurrency} {data.shop.currencyName}</p>
				</a>
			{/each}
		</div>
	{/if}
</div>

<style>
	.shop-container {
		max-width: 900px;
		margin: 0 auto;
		padding: 2rem;
		font-family: 'Kodchasan', sans-serif;
	}
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	h1 { margin: 0; }
	.back { color: #8492a6; text-decoration: none; }
	.back:hover { color: #1a1a2e; }
	.balance-pill {
		display: flex; align-items: center; gap: 0.5rem;
		padding: 0.5rem 1rem; border: 2px solid #8492a6; border-radius: 999px;
		background: white;
	}
	.orders-link { margin: 0 0 1.5rem 0; }
	.orders-link a { color: #af98ff; text-decoration: none; font-size: 0.9rem; }
	.empty { color: #8492a6; text-align: center; padding: 3rem 0; }
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 1.5rem;
	}
	.item-card {
		display: flex; flex-direction: column; gap: 0.5rem;
		padding: 1rem;
		border: 2px solid #8492a6;
		border-radius: 16px;
		background: white;
		text-decoration: none;
		color: #1a1a2e;
		transition: transform 0.15s, border-color 0.15s;
	}
	.item-card:hover { transform: translateY(-2px); border-color: #af98ff; }
	.item-img {
		width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px;
		background: #f4f4f8;
	}
	.item-img.placeholder {
		display: flex; align-items: center; justify-content: center;
		color: #8492a6; font-size: 0.85rem;
	}
	h3 { margin: 0; font-size: 1rem; }
	.cost { margin: 0; color: #af98ff; font-weight: 600; }
</style>
