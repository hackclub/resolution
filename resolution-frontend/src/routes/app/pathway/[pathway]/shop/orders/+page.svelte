<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>My Shop Orders</title></svelte:head>

<div class="wrap">
	<a class="back" href="/app/pathway/{data.pathwayId.toLowerCase()}/shop">← Back to shop</a>
	<h1>My orders</h1>

	{#if data.orders.length === 0}
		<p class="empty">You haven't placed any orders yet.</p>
	{:else}
		<div class="list">
			{#each data.orders as order}
				<div class="order">
					<div class="row">
						<strong>#{order.id.slice(-6)}</strong>
						<span class="status status-{order.status}">{order.status}</span>
					</div>
					<div class="meta">
						{order.totalCurrency} {data.shop.currencyName}
						· {new Date(order.createdAt).toLocaleDateString()}
					</div>
					{#if order.trackingNumber}
						<div class="tracking">Tracking: {order.carrier ?? ''} {order.trackingNumber}</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.wrap { max-width: 700px; margin: 0 auto; padding: 2rem; font-family: 'Kodchasan', sans-serif; }
	.back { color: #8492a6; text-decoration: none; }
	h1 { margin: 1rem 0; }
	.empty { color: #8492a6; }
	.list { display: flex; flex-direction: column; gap: 0.75rem; }
	.order { padding: 1rem; background: white; border: 2px solid #8492a6; border-radius: 12px; }
	.row { display: flex; justify-content: space-between; align-items: center; }
	.meta { color: #8492a6; font-size: 0.85rem; margin-top: 0.25rem; }
	.tracking { margin-top: 0.5rem; font-size: 0.85rem; }
	.status { font-size: 0.75rem; padding: 0.25rem 0.6rem; border-radius: 999px; background: #f4f4f8; }
	.status-FULFILLED { background: #d6f5e8; color: #1d8a5b; }
	.status-PENDING { background: #fff3cd; color: #856404; }
	.status-SENT_TO_WAREHOUSE { background: #e0ecff; color: #1f4ea0; }
	.status-CANCELED { background: #f8d7da; color: #721c24; }
</style>
