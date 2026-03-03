<script lang="ts">
	import PlatformBackground from '$lib/components/PlatformBackground.svelte';
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const tabs = [
		{ label: 'Items', href: '/app/warehouse-backend/items' },
		{ label: 'Orders', href: '/app/warehouse-backend/orders' },
		{ label: 'Batches', href: '/app/warehouse-backend/batches' },
		{ label: 'Order Templates', href: '/app/warehouse-backend/order-templates' }
	];
</script>

<svelte:head>
	<title>Warehouse Backend - Resolution</title>
</svelte:head>

<PlatformBackground>
	<div class="warehouse-container">
		<a href="/app" class="back-link">
			<img src="https://icons.hackclub.com/api/icons/8492a6/back" alt="Back" width="20" height="20" />
			Back to Dashboard
		</a>

		<header>
			<h1>Warehouse Backend</h1>
			<p class="subtitle">Admin inventory management</p>
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
</PlatformBackground>

<style>
	.warehouse-container {
		min-height: 100vh;
		padding: 2rem;
		color: #1a1a2e;
		max-width: 1000px;
		margin: 0 auto;
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
