<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/stores';

	let { children }: { children: Snippet } = $props();

	const tabs = [
		{ href: '/app/warehouse-backend', label: 'Inventory' },
		{ href: '/app/warehouse-backend/fulfillment', label: 'Fulfillment' }
	];
</script>

<svelte:head>
	<title>Warehouse Backend - Resolution</title>
</svelte:head>

<div class="warehouse-container">
	<a href="/app" class="back-link">
		<img src="https://icons.hackclub.com/api/icons/8492a6/back" alt="Back" width="20" height="20" />
		Back to Dashboard
	</a>

	<header>
		<h1>Warehouse Backend</h1>
		<p class="subtitle">Admin inventory management</p>
	</header>

	<nav class="tabs">
		{#each tabs as tab}
			<a
				href={tab.href}
				class="tab"
				class:active={$page.url.pathname === tab.href}
			>{tab.label}</a>
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

	.tabs {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.tab {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: #8492a6;
		text-decoration: none;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		font-family: inherit;
	}

	.tab:hover {
		color: #338eda;
	}

	.tab.active {
		color: #338eda;
		border-bottom-color: #338eda;
	}
</style>
