<script lang="ts">
	import type { PageData } from './$types';
	import { PATHWAY_INFO } from '$lib/pathways';

	let { data }: { data: PageData } = $props();

	const info = $derived(PATHWAY_INFO[data.pathwayId]);
	const pathwaySlug = $derived(data.pathwayId.toLowerCase());

	function priceLabel(price: number) {
		const label = price === 1 ? data.shop.currencyName : data.shop.currencyNamePlural;
		return `${price} ${label}`;
	}

	function sourceLabel(source: string) {
		switch (source) {
			case 'CUSTOM':
				return 'Custom';
			case 'WAREHOUSE_ITEM':
				return 'Warehouse item';
			case 'WAREHOUSE_TEMPLATE':
				return 'Warehouse template';
			default:
				return source;
		}
	}
</script>

<svelte:head>
	<title>{info?.label ?? data.pathwayId} Shop - Ambassador</title>
</svelte:head>

<div class="container">
	<a href="/app/ambassador" class="back-link">
		<img src="https://icons.hackclub.com/api/icons/8492a6/back" alt="Back" width="20" height="20" />
		Back to Ambassador Dashboard
	</a>

	<header>
		<div class="header-top">
			<div>
				<span class="pathway-badge" style="background: #{info?.color ?? '8492a6'}">
					{info?.label ?? data.pathwayId}
				</span>
				<h1>Shop Management</h1>
				<p class="subtitle">
					Currency: {data.shop.currencyName} / {data.shop.currencyNamePlural} ·
					{#if data.shop.isEnabled}
						<span class="enabled">Enabled</span>
					{:else}
						<span class="disabled">Disabled</span>
					{/if}
				</p>
			</div>
			<div class="header-actions">
				<a class="btn btn-primary" href="/app/ambassador/{pathwaySlug}/shop/create">
					<img src="https://icons.hackclub.com/api/icons/white/add" alt="" width="16" height="16" />
					New item
				</a>
				<a class="btn btn-outline" href="/app/ambassador/{pathwaySlug}/shop/fufill">
					<img src="https://icons.hackclub.com/api/icons/a633d6/package" alt="" width="16" height="16" />
					Fulfill orders
				</a>
			</div>
		</div>
	</header>

	<section class="stats">
		<div class="stat">
			<div class="stat-label">Total orders</div>
			<div class="stat-value">{data.totalOrders}</div>
		</div>
		<a class="stat stat-link" href="/app/ambassador/{pathwaySlug}/shop/fufill">
			<div class="stat-label">Awaiting fulfillment</div>
			<div class="stat-value" class:warn={data.awaitingFufillment > 0}>{data.awaitingFufillment}</div>
		</a>
		<div class="stat">
			<div class="stat-label">Active items</div>
			<div class="stat-value">{data.items.filter((i) => i.isActive).length}</div>
		</div>
	</section>

	<section class="items-section">
		<h2>Items ({data.items.length})</h2>
		{#if data.items.length === 0}
			<div class="empty-state">
				<p>No items yet.</p>
				<a class="btn btn-primary" href="/app/ambassador/{pathwaySlug}/shop/create">Create your first item</a>
			</div>
		{:else}
			<ul class="items-list">
				{#each data.items as item (item.id)}
					<li class="item-row">
						<div class="item-image">
							{#if item.itemImageUrl}
								<img src={item.itemImageUrl} alt={item.name} />
							{:else}
								<div class="item-image-placeholder">No image</div>
							{/if}
						</div>
						<div class="item-body">
							<div class="item-top">
								<h3>{item.name}</h3>
								<span class="badge source">{sourceLabel(item.sourceType)}</span>
								{#if item.isActive}
									<span class="badge active">Active</span>
								{:else}
									<span class="badge inactive">Inactive</span>
								{/if}
							</div>
							<p class="item-desc">{item.description}</p>
							<div class="item-meta">
								<span>{priceLabel(item.price)}</span>
								<span class="dot">·</span>
								<span>
									{#if item.stock === null}
										Unlimited stock
									{:else}
										{item.stock} in stock
									{/if}
								</span>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>

<style>
	.container {
		min-height: 100vh;
		padding: 2rem;
		color: #1f2d3d;
		max-width: 1000px;
		margin: 0 auto;
		font-family: 'Phantom Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: #fff;
	}

	.back-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #8492a6;
		text-decoration: none;
		font-size: 0.9rem;
		margin-bottom: 2rem;
	}
	.back-link:hover { color: #1a1a2e; }

	header { margin-bottom: 1.5rem; }
	.header-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		flex-wrap: wrap;
	}
	.header-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	h1 { font-size: 1.75rem; margin: 0.5rem 0 0.25rem 0; }
	.subtitle { color: #8492a6; margin: 0; font-size: 0.9rem; }
	.enabled { color: #33d6a6; font-weight: 600; }
	.disabled { color: #ec3750; font-weight: 600; }
	.pathway-badge {
		display: inline-block;
		padding: 0.25rem 0.6rem;
		border-radius: 999px;
		color: #fff;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.9rem;
		border-radius: 20px;
		font-family: 'Kodchasan', sans-serif;
		text-decoration: none;
		font-size: 0.875rem;
		border: 1px solid transparent;
		cursor: pointer;
		white-space: nowrap;
	}
	.btn-primary { background: #a633d6; color: #fff; }
	.btn-primary:hover { background: #8a25b3; }
	.btn-outline { background: rgba(255, 255, 255, 0.8); border-color: #a633d6; color: #a633d6; }
	.btn-outline:hover { background: #fff; }

	.stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		margin-bottom: 2rem;
	}
	.stat {
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #af98ff;
		border-radius: 12px;
		padding: 1rem 1.25rem;
		text-decoration: none;
		color: inherit;
	}
	.stat-link:hover { border-color: #a633d6; }
	.stat-label { font-size: 0.8rem; color: #8492a6; }
	.stat-value { font-size: 1.5rem; font-weight: 600; }
	.stat-value.warn { color: #ff8c37; }

	.items-section h2 { font-size: 1.25rem; margin: 0 0 1rem 0; }

	.empty-state {
		text-align: center;
		padding: 2rem;
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #af98ff;
		border-radius: 16px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: center;
	}
	.empty-state p { margin: 0; }

	.items-list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.item-row {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		background: #fff;
		border: 1px solid #af98ff;
		border-radius: 12px;
	}
	.item-image {
		width: 80px;
		height: 80px;
		flex-shrink: 0;
		border-radius: 8px;
		overflow: hidden;
		background: #f5f5fb;
	}
	.item-image img { width: 100%; height: 100%; object-fit: cover; }
	.item-image-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.7rem;
		color: #8492a6;
		text-align: center;
	}
	.item-body { flex: 1; min-width: 0; }
	.item-top {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 0.25rem;
	}
	.item-top h3 { font-size: 1rem; margin: 0; }
	.item-desc {
		font-size: 0.85rem;
		color: #5a6c7d;
		margin: 0.25rem 0 0.5rem 0;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.item-meta {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		color: #5a6c7d;
	}
	.dot { color: #c4cdd5; }
	.badge {
		font-size: 0.7rem;
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		font-weight: 600;
	}
	.badge.source { background: #eef0fb; color: #5a6c7d; }
	.badge.active { background: rgba(51, 214, 166, 0.15); color: #1a8c6a; }
	.badge.inactive { background: rgba(132, 146, 166, 0.15); color: #6b7480; }

	@media (max-width: 700px) {
		.stats { grid-template-columns: 1fr; }
	}
</style>
