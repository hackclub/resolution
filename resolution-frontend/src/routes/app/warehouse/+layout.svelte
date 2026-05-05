<script lang="ts">
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const tabs = [
		{ label: 'Items', href: '/app/warehouse/items' },
		{ label: 'Orders', href: '/app/warehouse/orders' },
		{ label: 'Fulfillment', href: '/app/warehouse/fulfillment' },
		{ label: 'Batches', href: '/app/warehouse/batches' },
		{ label: 'Order Templates', href: '/app/warehouse/order-templates' },
		{ label: 'Settings', href: '/app/warehouse/settings' }
	];
</script>

<svelte:head>
	<title>Warehouse - Resolution</title>
</svelte:head>

<div class="warehouse-container">
	<a href="/app" class="back-link">
		<img src="https://icons.hackclub.com/api/icons/8492a6/back" alt="Back" width="20" height="20" />
		Back to Dashboard
	</a>

	<header>
		<h1>Warehouse</h1>
		<p class="subtitle">Inventory management</p>
	</header>

	<nav class="tab-nav">
		{#each tabs as tab}
			<a href={tab.href} class="tab" class:active={$page.url.pathname.startsWith(tab.href)}>
				{tab.label}
			</a>
		{/each}
	</nav>

	{@render children()}
</div>

<style>
	.warehouse-container {
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

	.back-link:hover {
		color: #1a1a2e;
	}

	header {
		margin-bottom: 1.5rem;
	}

	h1 {
		font-size: 1.75rem;
		margin: 0 0 0.5rem 0;
	}

	.subtitle {
		color: #8492a6;
		margin: 0;
	}

	.tab-nav {
		display: flex;
		gap: 0;
		border-bottom: 1px solid #e0e0e0;
		margin-bottom: 1.5rem;
	}

	.tab {
		padding: 0.625rem 1.25rem;
		text-decoration: none;
		color: #8492a6;
		font-size: 0.9rem;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		font-family: 'Kodchasan', sans-serif;
	}

	.tab:hover {
		color: #1a1a2e;
	}

	.tab.active {
		color: #338eda;
		border-bottom-color: #338eda;
		font-weight: 600;
	}
</style>
