<script lang="ts">
	import type { PageData } from './$types';
	import PlatformBackground from '$lib/components/PlatformBackground.svelte';
	import { PATHWAY_INFO } from '$lib/pathways';

	let { data }: { data: PageData } = $props();
    
    let showAll = $state(false)

	const pathway = $derived(PATHWAY_INFO[data.pathwayId]);

	function priceLabel(price: number) {
		const label = price === 1 ? data.shop.currencyName : data.shop.currencyNamePlural;
		return `${price} ${label}`;
	}

	function statusLabel(status: string) {
		switch (status) {
			case 'PENDING':
				return 'Pending';
			case 'PROCESSING':
				return 'Processing';
			case 'FULFILLED':
				return 'Fulfilled';
			case 'CANCELED':
				return 'Cancelled';
			default:
				return status;
		}
	}

	function switchShowState(e: MouseEvent) {
		showAll = !showAll
	}
</script>

<svelte:head>
	<title>{pathway?.label ?? 'Pathway'} Shop - Resolution</title>
</svelte:head>

<PlatformBackground>
	<div class="page">
		<a href="/app/pathway/{data.pathwayId.toLowerCase()}" class="back-link">
			<img src="https://icons.hackclub.com/api/icons/8492a6/back" alt="Back" width="20" height="20" />
			Back to {pathway?.label ?? 'pathway'}
		</a>
        <div class="card">
            <header class="page-header">
                <div>
                    <span class="pathway-badge" style="background: #{pathway?.color ?? '8492a6'}">
                        {pathway?.label ?? data.pathwayId}
                    </span>
                    <h1>Shop</h1>
                    <p class="subtitle">
                        Spend your {data.shop.currencyNamePlural} on goodies!
                    </p>
                </div>
                <div class="balance-card">
                    <div class="balance-label">Your balance</div>
                    <div class="balance-value">
                        {data.balance}
                        <span class="balance-unit">{data.balance === 1 ? data.shop.currencyName : data.shop.currencyNamePlural}</span>
                    </div>
                </div>
            </header>

            <section class="items-section">
                <h2>Items</h2>
                {#if data.items.length === 0}
                    <div class="empty-card">
                        <p>No items in the shop yet. Check back soon!</p>
                    </div>
                {:else}
                    <div class="items-grid">
                        {#each data.items as item, index (item.id)}
                            {#if index <= 3 || showAll}
                                {@const outOfStock = item.stock !== null && item.stock <= 0}
                                {@const cantAfford = data.balance < item.price}
                                <a
                                    href="/app/pathway/{data.pathwayId.toLowerCase()}/shop/{item.id}"
                                    class="item-card"
                                    class:disabled={outOfStock}
                                >
                                    <div class="item-image">
                                        {#if item.itemImageUrl}
                                            <img src={item.itemImageUrl} alt={item.name} />
                                        {:else}
                                            <div class="item-image-placeholder">No image</div>
                                        {/if}
                                        {#if outOfStock}
                                            <div class="overlay">Out of stock</div>
                                        {/if}
                                    </div>
                                    <div class="item-body">
                                        <div class="item-top">
                                            <h3>{item.name}</h3>
                                            <span class="type-tag">
                                                {item.itemType === 'PHYSICAL' ? 'Physical' : 'Digital'}
                                            </span>
                                        </div>
                                        <p class="item-desc">{item.description}</p>
                                        <div class="item-foot">
                                            <span class="price" class:price-low={cantAfford && !outOfStock}>
                                                {priceLabel(item.price)}
                                            </span>
                                            {#if item.stock !== null && !outOfStock}
                                                <span class="stock">{item.stock} left</span>
                                            {/if}
                                        </div>
                                    </div>
                                </a>
                            {/if}
                        {/each}
                    </div>
                    <button type="button" class="show-more" class:open={showAll} onclick={switchShowState}>
                        <img class="show-more-image" src="https://icons.hackclub.com/api/icons/black/right-caret" alt="">
                        {showAll ? 'Show less...' : 'Show more...'}
                    </button>
                {/if}
            </section>

            <section class="orders-section">
                <h2>Recent orders</h2>
                {#if data.orders.length === 0}
                    <div class="empty-card">
                        <p>You haven't placed any orders yet.</p>
                    </div>
                {:else}
                    <ul class="orders-list">
                        {#each data.orders as order (order.id)}
                            <li class="order-row">
                                <div class="order-main">
                                    <div class="order-name">{order.itemNameSnapshot}</div>
                                    <div class="order-meta">
                                        {new Date(order.createdAt).toLocaleDateString()} ·
                                        {priceLabel(order.totalAmount)}
                                    </div>
                                </div>
                                <span class="status status-{order.status.toLowerCase()}">
                                    {statusLabel(order.status)}
                                </span>
                            </li>
                        {/each}
                    </ul>
                {/if}
            </section>
        </div>
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

    .card {
		background: rgba(255, 255, 255, 0.95);
		border: 1px solid #af98ff;
		border-radius: 16px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
        padding: 1.5rem;
	}

    .show-more {
		all: unset;
		display: flex;
		align-items: center;
		gap: 0.25rem;
		width: fit-content;
		margin-left: auto;
		font-style: italic;
		cursor: pointer;
    }

	.show-more:hover {
		text-decoration: underline;
	}
	
	.show-more:focus-visible {
		outline: revert;
	}

	.show-more-image {
		height: 1rem;
		width: 1rem;
		transition: transform 0.15s ease;
	}

	.show-more.open .show-more-image {
		transform: rotate(90deg);
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

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 2rem;
		margin-bottom: 2.5rem;
	}

	.pathway-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
		margin-bottom: 0.75rem;
	}

	h1 {
		font-size: 2rem;
		margin: 0;
		line-height: 1.3;
	}

	.subtitle {
		color: #8492a6;
		margin: 0.5rem 0 0 0;
	}

	.balance-card {
		background: rgba(255, 255, 255, 0.95);
		border: 1px solid #af98ff;
		border-radius: 12px;
		padding: 1rem 1.25rem;
		min-width: 180px;
		text-align: right;
	}

	.balance-label {
		font-size: 0.75rem;
		color: #8492a6;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.balance-value {
		font-size: 1.75rem;
		font-weight: 700;
		color: #1a1a2e;
		margin-top: 0.25rem;
	}

	.balance-unit {
		font-size: 0.85rem;
		font-weight: 500;
		color: #8492a6;
		margin-left: 0.25rem;
	}

	h2 {
		font-size: 1.25rem;
		margin: 0 0 1rem 0;
	}

	.items-section,
	.orders-section {
		margin-bottom: 2.5rem;
	}

	.items-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 1.25rem;
	}

	.item-card {
		display: flex;
		flex-direction: column;
		background: rgba(255, 255, 255, 0.95);
		border: 1px solid #e0e0e0;
		border-radius: 16px;
		text-decoration: none;
		color: inherit;
		overflow: hidden;
		transition: transform 0.15s ease, border-color 0.15s ease;
	}

	.item-card:hover {
		transform: translateY(-2px);
		border-color: #af98ff;
	}

	.item-card.disabled {
		opacity: 0.6;
	}

	.item-card.disabled:hover {
		transform: none;
		border-color: #e0e0e0;
	}

	.item-image {
		position: relative;
		aspect-ratio: 4 / 3;
		background: #f4f5f7;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.item-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.item-image-placeholder {
		color: #8492a6;
		font-size: 0.85rem;
	}

	.overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(26, 26, 46, 0.6);
		color: white;
		font-weight: 600;
	}

	.item-body {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 1;
	}

	.item-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.item-top h3 {
		font-size: 1rem;
		margin: 0;
		line-height: 1.3;
	}

	.type-tag {
		font-size: 0.7rem;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		background: #f0eaff;
		color: #6b4dd6;
		white-space: nowrap;
	}

	.item-desc {
		color: #8492a6;
		font-size: 0.85rem;
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.item-foot {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: auto;
		padding-top: 0.5rem;
	}

	.price {
		font-weight: 600;
		color: #33d6a6;
	}

	.price-low {
		color: #ec3750;
	}

	.stock {
		font-size: 0.8rem;
		color: #8492a6;
	}

	.empty-card {
		background: rgba(255, 255, 255, 0.85);
		border: 1px dashed #d0d5dd;
		border-radius: 12px;
		padding: 2rem;
		text-align: center;
		color: #8492a6;
	}

	.orders-list {
		list-style: none;
		padding: 0;
		margin: 0;
		background: rgba(255, 255, 255, 0.95);
		border: 1px solid #e0e0e0;
		border-radius: 12px;
		overflow: hidden;
	}

	.order-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 0.875rem 1.25rem;
		border-bottom: 1px solid #f0f0f0;
	}

	.order-row:last-child {
		border-bottom: none;
	}

	.order-name {
		font-weight: 600;
	}

	.order-meta {
		font-size: 0.8rem;
		color: #8492a6;
		margin-top: 0.125rem;
	}

	.status {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.6rem;
		border-radius: 999px;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.status-pending {
		background: #fff4e0;
		color: #b56a00;
	}

	.status-processing {
		background: #e0eeff;
		color: #1c5cc7;
	}

	.status-fulfilled {
		background: #e0f7ee;
		color: #1d8a5d;
	}

	.status-canceled {
		background: #fee;
		color: #c02a3c;
	}

	@media (max-width: 768px) {
		.page {
			padding: 1rem;
		}

		.page-header {
			flex-direction: column;
		}

		.balance-card {
			text-align: left;
		}
	}
</style>
