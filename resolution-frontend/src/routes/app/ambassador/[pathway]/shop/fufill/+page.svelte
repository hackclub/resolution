<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { PATHWAY_INFO } from '$lib/pathways';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const info = $derived(PATHWAY_INFO[data.pathwayId]);
	const pathwaySlug = $derived(data.pathwayId.toLowerCase());

	let denyOpenFor = $state<string | null>(null);

	function formatCents(cents: number | null | undefined) {
		if (cents == null) return '—';
		return `$${(cents / 100).toFixed(2)}`;
	}

	function sourceLabel(s: string) {
		switch (s) {
			case 'CUSTOM': return 'Custom (manual fulfillment)';
			case 'WAREHOUSE_ITEM': return 'Warehouse item';
			case 'WAREHOUSE_TEMPLATE': return 'Warehouse template';
			default: return s;
		}
	}
</script>

<svelte:head>
	<title>Fulfill Orders - {info?.label ?? data.pathwayId}</title>
</svelte:head>

<div class="container">
	<a href="/app/ambassador/{pathwaySlug}/shop" class="back-link">
		<img src="https://icons.hackclub.com/api/icons/8492a6/back" alt="Back" width="20" height="20" />
		Back to Shop
	</a>

	<header>
		<h1>Fulfill Orders</h1>
		<p class="subtitle">
			{data.pendingOrders.length} pending order{data.pendingOrders.length === 1 ? '' : 's'} for {info?.label ?? data.pathwayId}.
		</p>
	</header>

	{#if form && 'error' in form && form.error}
		<div class="alert error">{form.error}</div>
	{/if}
	{#if form?.success}
		<div class="alert success">
			Order updated.{#if 'warehouseOrderId' in form && form.warehouseOrderId}
				Warehouse order created: {form.warehouseOrderId}
			{/if}
		</div>
	{/if}

	{#if data.pendingOrders.length === 0}
		<div class="empty">
			<p>No pending orders right now. 🎉</p>
		</div>
	{:else}
		<ul class="orders">
			{#each data.pendingOrders as order (order.id)}
				{@const est = data.estimatesByOrderId[order.id]}
				{@const sourceType = order.item?.sourceType ?? 'CUSTOM'}
				{@const isCustom = sourceType === 'CUSTOM'}
				<li class="order">
					<div class="order-head">
						<div>
							<h3>{order.itemNameSnapshot}</h3>
							<div class="order-meta">
								<span class="badge source">{sourceLabel(sourceType)}</span>
								<span>·</span>
								<span>{order.totalAmount} {order.totalAmount === 1 ? 'wish' : 'wishes'}</span>
								<span>·</span>
								<span>{new Date(order.createdAt).toLocaleString()}</span>
							</div>
						</div>
						<div class="order-id">#{order.id.slice(0, 8)}</div>
					</div>

					<div class="grid">
						<div class="block">
							<div class="block-label">Buyer</div>
							{#if order.user}
								<div>{order.user.firstName ?? ''} {order.user.lastName ?? ''}</div>
								<div class="muted">{order.user.email}</div>
							{:else}
								<div class="muted">User no longer exists</div>
							{/if}
							{#if order.phone}
								<div class="muted">{order.phone}</div>
							{/if}
						</div>

						<div class="block">
							<div class="block-label">Shipping address</div>
							{#if order.shippingAddress}
								<div>{order.shippingAddress.addressLine1}</div>
								{#if order.shippingAddress.addressLine2}
									<div>{order.shippingAddress.addressLine2}</div>
								{/if}
								<div>
									{order.shippingAddress.city}, {order.shippingAddress.stateProvince}
									{order.shippingAddress.zipPostalCode}
								</div>
								<div>{order.shippingAddress.country}</div>
							{:else}
								<div class="muted">No shipping address (digital / grant)</div>
							{/if}
						</div>

						{#if !isCustom}
							<div class="block">
								<div class="block-label">Estimated cost</div>
								{#if est}
									<div>Items: <strong>{formatCents(est.itemTotalCents)}</strong></div>
									<div>
										Shipping:
										<strong>{formatCents(est.estimatedShippingCents)}</strong>
										{#if est.estimatedShippingCents == null}
											<span class="muted">(no quote)</span>
										{/if}
									</div>
									<div class="total">Total: {formatCents(est.totalCents)}</div>
								{:else}
									<div class="muted">No estimate available</div>
								{/if}
							</div>
						{/if}
					</div>

					{#if order.userNotes}
						<div class="notes">
							<strong>Buyer note:</strong> {order.userNotes}
						</div>
					{/if}

					{#if isCustom}
						<div class="note-banner">
							This is a custom item. Approving will mark the order fulfilled — you handle delivery manually.
						</div>
					{/if}

					<div class="actions">
						<form method="POST" action="?/approve" use:enhance>
							<input type="hidden" name="id" value={order.id} />
							<input type="text" name="note" placeholder="Fulfillment note (optional)" />
							<button type="submit" class="btn btn-primary">
								{isCustom ? 'Mark fulfilled' : 'Approve & ship'}
							</button>
						</form>

						{#if denyOpenFor === order.id}
							<form method="POST" action="?/deny" use:enhance class="deny-form">
								<input type="hidden" name="id" value={order.id} />
								<input type="text" name="note" placeholder="Reason for denial (required)" required />
								<button type="submit" class="btn btn-danger">Confirm deny</button>
								<button
									type="button"
									class="btn btn-ghost"
									onclick={() => (denyOpenFor = null)}
								>
									Cancel
								</button>
							</form>
						{:else}
							<button
								type="button"
								class="btn btn-outline-danger"
								onclick={() => (denyOpenFor = order.id)}
							>
								Deny
							</button>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
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

	h1 { font-size: 1.75rem; margin: 0 0 0.25rem 0; }
	.subtitle { color: #8492a6; margin: 0 0 1.5rem 0; }

	.alert {
		padding: 0.75rem 1rem;
		border-radius: 12px;
		margin-bottom: 1rem;
		font-size: 0.9rem;
	}
	.alert.success { background: rgba(51, 214, 166, 0.15); border: 1px solid #33d6a6; color: #1a8c6a; }
	.alert.error { background: rgba(236, 55, 80, 0.1); border: 1px solid #ec3750; color: #ec3750; }

	.empty {
		text-align: center;
		padding: 3rem;
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #af98ff;
		border-radius: 16px;
		color: #5a6c7d;
	}

	.orders { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 1rem; }
	.order {
		background: #fff;
		border: 1px solid #af98ff;
		border-radius: 16px;
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.order-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}
	.order-head h3 { font-size: 1.05rem; margin: 0 0 0.25rem 0; }
	.order-meta {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		color: #5a6c7d;
		flex-wrap: wrap;
	}
	.order-id { font-size: 0.75rem; color: #8492a6; font-family: ui-monospace, monospace; }

	.badge { font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 999px; font-weight: 600; background: #eef0fb; color: #5a6c7d; }

	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		font-size: 0.85rem;
	}
	.block { background: #f8f9fc; padding: 0.75rem; border-radius: 10px; }
	.block-label { font-size: 0.7rem; text-transform: uppercase; color: #8492a6; letter-spacing: 0.04em; margin-bottom: 0.3rem; }
	.muted { color: #8492a6; }
	.total { margin-top: 0.25rem; font-weight: 600; }

	.notes {
		font-size: 0.85rem;
		background: #fff7e6;
		border: 1px solid #ffd591;
		padding: 0.6rem 0.8rem;
		border-radius: 10px;
	}
	.note-banner {
		font-size: 0.85rem;
		background: #f0f5ff;
		border: 1px solid #adc6ff;
		padding: 0.6rem 0.8rem;
		border-radius: 10px;
		color: #1f3d7a;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		align-items: center;
	}
	.actions form {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-wrap: wrap;
	}
	.actions input[type="text"] {
		font-family: inherit;
		font-size: 0.85rem;
		padding: 0.45rem 0.65rem;
		border-radius: 8px;
		border: 1px solid #d0d6df;
		background: #fff;
		min-width: 220px;
	}
	.actions input[type="text"]:focus { outline: 2px solid #af98ff; border-color: #a633d6; }

	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.45rem 0.9rem;
		border-radius: 20px;
		font-family: 'Kodchasan', sans-serif;
		font-size: 0.85rem;
		border: 1px solid transparent;
		cursor: pointer;
		text-decoration: none;
	}
	.btn-primary { background: #a633d6; color: #fff; }
	.btn-primary:hover { background: #8a25b3; }
	.btn-danger { background: #ec3750; color: #fff; }
	.btn-danger:hover { background: #c92a40; }
	.btn-outline-danger { background: #fff; border-color: #ec3750; color: #ec3750; }
	.btn-outline-danger:hover { background: #ec3750; color: #fff; }
	.btn-ghost { background: transparent; color: #5a6c7d; }
	.btn-ghost:hover { color: #1a1a2e; }

	@media (max-width: 800px) {
		.grid { grid-template-columns: 1fr; }
	}
</style>
