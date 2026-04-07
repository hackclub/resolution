<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type Order = (typeof data.orders)[number];

	const usersById = $derived(new Map(data.users.map((u) => [u.id, u])));

	const linesByOrder = $derived(() => {
		const m = new Map<string, typeof data.lines>();
		for (const l of data.lines) {
			const arr = m.get(l.orderId) ?? [];
			arr.push(l);
			m.set(l.orderId, arr);
		}
		return m;
	});

	function orderHasWarehouseLink(o: Order): boolean {
		const lines = linesByOrder().get(o.id) ?? [];
		return lines.length > 0 && lines.every((l) => !!l.warehouseItemId);
	}

	const groupedByUser = $derived(() => {
		const map = new Map<string, Order[]>();
		for (const o of data.orders) {
			const arr = map.get(o.userId) ?? [];
			arr.push(o);
			map.set(o.userId, arr);
		}
		return [...map.entries()];
	});

	let selected = $state<Set<string>>(new Set());
	let selectedUserId: string | null = $state(null);

	function toggle(orderId: string, userId: string) {
		if (selectedUserId && selectedUserId !== userId) {
			selected = new Set([orderId]);
			selectedUserId = userId;
			return;
		}
		const next = new Set(selected);
		if (next.has(orderId)) next.delete(orderId);
		else next.add(orderId);
		selected = next;
		selectedUserId = next.size > 0 ? userId : null;
	}

	let showWarehouseModal = $state(false);
	let serviceCode = $state('');
	let serviceName = $state('');
	let estCents = $state(0);

	let trackingFor: string | null = $state(null);
	let trackingNumber = $state('');
	let carrier = $state('');
</script>

<svelte:head><title>Shop orders</title></svelte:head>

<div class="wrap">
	<a class="back" href="/app/ambassador/{data.pathwayId.toLowerCase()}/shop">← Shop</a>
	<h1>Orders</h1>

	{#if form?.error}<p class="error">{form.error}</p>{/if}
	{#if form?.success}<p class="ok">Done.</p>{/if}

	{#if selected.size > 0}
		<div class="bulk-bar">
			{selected.size} order(s) selected ·
			<button onclick={() => (showWarehouseModal = true)}>Send to warehouse</button>
			<button onclick={() => { selected = new Set(); selectedUserId = null; }}>Clear</button>
		</div>
	{/if}

	{#each groupedByUser() as [userId, orders]}
		{@const u = usersById.get(userId)}
		<section class="user-group">
			<h2>{u?.firstName ?? ''} {u?.lastName ?? ''} · <span class="email">{u?.email ?? userId}</span></h2>
			{#each orders as o}
				{@const lines = linesByOrder().get(o.id) ?? []}
				{@const linkable = orderHasWarehouseLink(o) && o.status === 'PENDING'}
				<div class="order">
					<label class="select">
						<input
							type="checkbox"
							checked={selected.has(o.id)}
							disabled={!linkable}
							onchange={() => toggle(o.id, o.userId)}
						/>
					</label>
					<div class="body">
						<div class="row">
							<strong>#{o.id.slice(-6)}</strong>
							<span class="status status-{o.status}">{o.status}</span>
							<span class="meta">{o.totalCurrency} {data.shop.currencyName}</span>
						</div>
						<ul class="lines">
							{#each lines as l}
								<li>
									{l.quantity}× {l.itemName}
									{#if l.warehouseItemId}<span class="link">📦 {l.warehouseItemName ?? ''}</span>{/if}
								</li>
							{/each}
						</ul>
						<div class="addr">
							{o.firstName} {o.lastName} · {o.addressLine1}, {o.city}, {o.stateProvince} {o.postalCode ?? ''}, {o.country}
						</div>

						{#if o.status === 'PENDING'}
							<div class="actions">
								<button onclick={() => { trackingFor = o.id; trackingNumber = ''; carrier = ''; }}>
									Mark fulfilled (manual)
								</button>
							</div>
							{#if trackingFor === o.id}
								<form method="POST" action="?/markFulfilled" class="track-form" use:enhance={() => async ({ update }) => { await update(); trackingFor = null; }}>
									<input type="hidden" name="orderId" value={o.id} />
									<input name="carrier" placeholder="Carrier" bind:value={carrier} required />
									<input name="trackingNumber" placeholder="Tracking #" bind:value={trackingNumber} required />
									<button type="submit">Send</button>
									<button type="button" onclick={() => (trackingFor = null)}>Cancel</button>
								</form>
							{/if}
						{:else if o.status === 'FULFILLED'}
							<div class="meta">Tracking: {o.carrier} {o.trackingNumber}</div>
						{:else if o.status === 'SENT_TO_WAREHOUSE'}
							<div class="meta">Warehouse order: {o.warehouseOrderId}</div>
						{/if}
					</div>
				</div>
			{/each}
		</section>
	{/each}

	{#if data.orders.length === 0}<p class="empty">No orders yet.</p>{/if}

	{#if showWarehouseModal}
		<div class="modal-bg" onclick={() => (showWarehouseModal = false)}>
			<div class="modal" onclick={(e) => e.stopPropagation()}>
				<h2>Send to warehouse</h2>
				<p>{selected.size} order(s) will be merged into ONE warehouse shipment.</p>
				<p class="help">
					Fetch a shipping rate using the warehouse <code>/api/shipping-rates</code> endpoint and paste the
					service code, name, and cost in cents below.
				</p>
				<form
					method="POST"
					action="?/sendToWarehouse"
					use:enhance={() => async ({ update }) => {
						await update();
						showWarehouseModal = false;
						selected = new Set();
						selectedUserId = null;
					}}
				>
					<input type="hidden" name="orderIds" value={JSON.stringify([...selected])} />
					<label>Service code<input name="serviceCode" bind:value={serviceCode} required /></label>
					<label>Service name (optional)<input name="serviceName" bind:value={serviceName} /></label>
					<label>Estimated shipping (cents)<input name="estimatedShippingCents" type="number" min="0" bind:value={estCents} required /></label>
					<div class="row">
						<button type="submit">Confirm</button>
						<button type="button" onclick={() => (showWarehouseModal = false)}>Cancel</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>

<style>
	.wrap { max-width: 1000px; margin: 0 auto; padding: 2rem; font-family: 'Kodchasan', sans-serif; }
	.back { color: #8492a6; text-decoration: none; }
	h1 { margin: 1rem 0; }
	h2 { font-size: 1rem; margin: 1.5rem 0 0.5rem; }
	.email { color: #8492a6; font-weight: normal; font-size: 0.85rem; }
	.bulk-bar { background: #fff3cd; border: 1px solid #856404; padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
	.user-group { margin-bottom: 1.5rem; }
	.order { display: flex; gap: 0.75rem; padding: 1rem; background: white; border: 1px solid #8492a6; border-radius: 10px; margin-bottom: 0.5rem; }
	.select { padding-top: 0.25rem; }
	.body { flex: 1; }
	.row { display: flex; align-items: center; gap: 0.75rem; }
	.status { font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 999px; background: #f4f4f8; }
	.status-PENDING { background: #fff3cd; color: #856404; }
	.status-FULFILLED { background: #d6f5e8; color: #1d8a5b; }
	.status-SENT_TO_WAREHOUSE { background: #e0ecff; color: #1f4ea0; }
	.status-CANCELED { background: #f8d7da; color: #721c24; }
	.meta { color: #8492a6; font-size: 0.85rem; }
	.lines { margin: 0.5rem 0; padding-left: 1.2rem; font-size: 0.85rem; }
	.link { color: #1d8a5b; }
	.addr { font-size: 0.8rem; color: #4a4a5e; }
	.actions { margin-top: 0.5rem; }
	.track-form { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
	input { padding: 0.4rem; border: 1px solid #8492a6; border-radius: 6px; font: inherit; }
	button { padding: 0.4rem 0.8rem; background: white; border: 1px solid #8492a6; border-radius: 6px; cursor: pointer; font: inherit; }
	.error { color: #ec3750; }
	.ok { color: #1d8a5b; }
	.empty { color: #8492a6; text-align: center; padding: 3rem; }
	.modal-bg { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; }
	.modal { background: white; padding: 2rem; border-radius: 12px; max-width: 480px; width: 90%; }
	.modal form { display: flex; flex-direction: column; gap: 0.75rem; }
	.modal label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; }
	.help { font-size: 0.8rem; color: #8492a6; }
	code { background: #f4f4f8; padding: 0.1rem 0.3rem; border-radius: 4px; }
</style>
