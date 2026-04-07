<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	let { data }: { data: PageData } = $props();
	let q = $state('');
	const filtered = $derived(
		data.participants.filter((p) =>
			`${p.firstName ?? ''} ${p.lastName ?? ''} ${p.email}`.toLowerCase().includes(q.toLowerCase())
		)
	);
</script>

<svelte:head><title>Participant balances</title></svelte:head>

<div class="wrap">
	<a class="back" href="/app/ambassador/{data.pathwayId.toLowerCase()}/shop">← Shop</a>
	<h1>Participant balances</h1>
	<input class="search" type="search" placeholder="Search…" bind:value={q} />

	<div class="list">
		{#each filtered as p}
			<form method="POST" action="?/setBalance" class="row" use:enhance>
				<input type="hidden" name="userId" value={p.userId} />
				<div class="who">
					<strong>{p.firstName ?? ''} {p.lastName ?? ''}</strong>
					<span class="email">{p.email}</span>
				</div>
				<input type="number" name="value" min="0" value={p.balance} class="bal" />
				<span class="curr">{data.shop.currencyName}</span>
				<button type="submit">Save</button>
			</form>
		{/each}
		{#if filtered.length === 0}
			<p class="empty">No participants enrolled in this pathway.</p>
		{/if}
	</div>
</div>

<style>
	.wrap { max-width: 800px; margin: 0 auto; padding: 2rem; font-family: 'Kodchasan', sans-serif; }
	.back { color: #8492a6; text-decoration: none; }
	h1 { margin: 1rem 0; }
	.search { width: 100%; padding: 0.5rem; border: 1px solid #8492a6; border-radius: 6px; margin-bottom: 1rem; }
	.list { display: flex; flex-direction: column; gap: 0.5rem; }
	.row {
		display: grid;
		grid-template-columns: 1fr 100px auto auto;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		background: white; border: 1px solid #8492a6; border-radius: 8px;
	}
	.who { display: flex; flex-direction: column; }
	.email { color: #8492a6; font-size: 0.8rem; }
	.bal { padding: 0.4rem; border: 1px solid #8492a6; border-radius: 6px; font: inherit; text-align: right; }
	.curr { color: #8492a6; font-size: 0.85rem; }
	button { padding: 0.4rem 0.8rem; background: #af98ff; color: white; border: none; border-radius: 6px; cursor: pointer; }
	.empty { color: #8492a6; text-align: center; padding: 2rem; }
</style>
