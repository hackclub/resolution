<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let expandedOrder = $state<string | null>(null);
	let activeTagFilter = $state<string | null>(null);
	let statusFilter = $state<string | null>(null);

	function formatCost(cents: number) {
		return `$${(cents / 100).toFixed(2)}`;
	}

	function statusLabel(status: string) {
		const map: Record<string, string> = {
			DRAFT: 'Draft',
			ESTIMATED: 'Estimated',
			APPROVED: 'Approved',
			SHIPPED: 'Shipped',
			CANCELED: 'Canceled'
		};
		return map[status] || status;
	}

	function statusClass(status: string) {
		const map: Record<string, string> = {
			DRAFT: 'status-draft',
			ESTIMATED: 'status-estimated',
			APPROVED: 'status-approved',
			SHIPPED: 'status-shipped',
			CANCELED: 'status-canceled'
		};
		return map[status] || '';
	}

	function formatCreatorName(creator: { firstName: string | null; lastName: string | null; email: string }): string {
		const name = [creator.firstName, creator.lastName].filter(Boolean).join(' ');
		return name || creator.email;
	}

	const statuses = ['ESTIMATED', 'APPROVED', 'SHIPPED', 'CANCELED'];

	const filteredOrders = $derived(() => {
		let orders = data.orders;
		if (statusFilter) {
			orders = orders.filter((o: any) => o.status === statusFilter);
		}
		if (activeTagFilter) {
			orders = orders.filter((o: any) => o.tags.some((t: any) => t.tag === activeTagFilter));
		}
		return orders;
	});

	// ── QZ Tray + Label state ──
	let qz: any = null;
	let qzStatus = $state<'connecting' | 'connected' | 'error'>('connecting');
	let labelLoading = $state<Record<string, boolean>>({});
	let labelErrors = $state<Record<string, string>>({});
	let labelResults = $state<Record<string, { trackingNumber: string | null; labelUrl: string | null; packingSlipBase64: string; shippingMethod: string }>>({});

	function getQZSettings(): { printer: string; dpi: number } {
		try {
			const saved = localStorage.getItem('warehouse-qz-settings');
			if (saved) return JSON.parse(saved);
		} catch {}
		return { printer: '', dpi: 203 };
	}

	async function initQZ() {
		const maxWait = 5000;
		const start = Date.now();
		while (!(window as any).qz && Date.now() - start < maxWait) {
			await new Promise(r => setTimeout(r, 100));
		}
		qz = (window as any).qz;
		if (!qz) { qzStatus = 'error'; return; }

		// Only set up signing if certificate is configured; otherwise QZ runs in demo/unsigned mode
		try {
			const certRes = await fetch('/api/qz/cert', { cache: 'no-store' });
			if (certRes.ok) {
				const certText = await certRes.text();
				if (certText && !certText.includes('not configured')) {
					qz.security.setCertificatePromise(function(resolve: any) { resolve(certText); });
					qz.security.setSignatureAlgorithm('SHA512');
					qz.security.setSignaturePromise(function(toSign: string) {
						return function(resolve: any, reject: any) {
							fetch('/api/qz/sign', { method: 'POST', cache: 'no-store', body: toSign, headers: { 'Content-Type': 'text/plain' } })
								.then((r: Response) => r.ok ? resolve(r.text()) : reject(r.text()));
						};
					});
				}
			}
		} catch {}

		try {
			if (!qz.websocket.isActive()) await qz.websocket.connect();
			qzStatus = 'connected';
		} catch { qzStatus = 'error'; }
	}

	async function printAll(result: { labelUrl: string | null; packingSlipBase64: string }) {
		if (!qz || qzStatus !== 'connected') return;
		const settings = getQZSettings();
		if (!settings.printer) { alert('No printer selected. Go to Settings to configure.'); return; }
		const config = () => qz.configs.create(settings.printer, {
			colorType: 'blackwhite', density: settings.dpi, units: 'in',
			rasterize: true, interpolation: 'nearest-neighbor', size: { width: 4, height: 6 }
		});

		// Print label
		if (result.labelUrl) {
			const base64Data = result.labelUrl.replace(/^data:(application\/pdf|image\/png);base64,/, '');
			const format = result.labelUrl.startsWith('data:image/png') ? 'image' : 'pdf';
			await qz.print(config(), [{ type: 'pixel', format, flavor: 'base64', data: base64Data }]);
		}

		// Print packing slip
		if (result.packingSlipBase64) {
			const text = decodeURIComponent(escape(atob(result.packingSlipBase64)));
			const html = `<pre style="font-family:monospace;font-size:11px;padding:10px;white-space:pre-wrap;">${text}</pre>`;
			await qz.print(config(), [{ type: 'html', format: 'plain', data: html }]);
		}
	}

	async function getLabel(orderId: string) {
		labelLoading[orderId] = true;
		labelErrors[orderId] = '';
		try {
			const res = await fetch('/api/fulfillment/get-label', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ orderId })
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({ message: 'Failed' }));
				labelErrors[orderId] = err.message || `Error ${res.status}`;
				return;
			}
			const result = await res.json();
			labelResults[orderId] = result;

			// Update the order status in the local data
			const order = data.orders.find((o: any) => o.id === orderId);
			if (order) {
				(order as any).status = 'SHIPPED';
				(order as any).trackingNumber = result.trackingNumber;
				(order as any).labelUrl = result.labelUrl;
			}
		} catch (e: any) {
			labelErrors[orderId] = e?.message || 'Network error';
		} finally {
			labelLoading[orderId] = false;
		}
	}

	$effect(() => { initQZ(); });
</script>

<svelte:head>
	<script src="https://unpkg.com/qz-tray@2.2.4/qz-tray.js"></script>
</svelte:head>

<div class="qz-status-bar">
	{#if qzStatus === 'connecting'}
		<span class="qz-indicator qz-connecting">⏳ QZ Tray connecting...</span>
	{:else if qzStatus === 'connected'}
		<span class="qz-indicator qz-connected">🖨️ Printer ready</span>
	{:else}
		<span class="qz-indicator qz-error">✗ QZ Tray not connected — <a href="/app/warehouse/settings">Settings</a></span>
	{/if}
</div>

<div class="filter-bar">
	<div class="status-filters">
		<span class="filter-label">Status:</span>
		<button class="filter-btn" class:active={!statusFilter} onclick={() => statusFilter = null}>All ({data.orders.length})</button>
		{#each statuses as s}
			{@const count = data.orders.filter((o: any) => o.status === s).length}
			{#if count > 0}
				<button class="filter-btn" class:active={statusFilter === s} onclick={() => statusFilter = statusFilter === s ? null : s}>
					{statusLabel(s)} ({count})
				</button>
			{/if}
		{/each}
	</div>

	{#if data.allTags.length > 0}
		<div class="tag-filters">
			<span class="filter-label">Tag:</span>
			<button class="filter-btn" class:active={!activeTagFilter} onclick={() => activeTagFilter = null}>All</button>
			{#each data.allTags as tag}
				<button
					class="filter-btn"
					class:active={activeTagFilter === tag}
					onclick={() => activeTagFilter = activeTagFilter === tag ? null : tag}
				>{tag}</button>
			{/each}
		</div>
	{/if}
</div>

{#if filteredOrders().length === 0}
	<div class="empty-state">
		<p>No orders to fulfill.</p>
		<p class="hint">Placed orders will appear here.</p>
	</div>
{:else}
	<section class="orders-section">
		<div class="items-table-wrapper">
			<table class="items-table">
				<thead>
					<tr>
						<th>ID</th>
						<th>Recipient</th>
						<th>Ordered By</th>
						<th>Destination</th>
						<th>Items</th>
						<th>Est. Shipping</th>
						<th>Status</th>
						<th>Tags</th>
						<th>Created</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each filteredOrders() as order (order.id)}
						<tr>
							<td><code class="fulfillment-id">#{order.fulfillmentId}</code></td>
							<td>
								<span class="item-name">{order.firstName} {order.lastName}</span>
								<br /><span class="hint">{order.email}</span>
							</td>
							<td>
								<span class="item-name">{formatCreatorName(order.createdBy)}</span>
								<br /><span class="hint">{order.createdBy.email}</span>
							</td>
							<td>
								{order.city}, {order.stateProvince}
								<br /><span class="hint">{order.country}{order.postalCode ? ` ${order.postalCode}` : ''}</span>
							</td>
							<td>
								{order.items.length} item{order.items.length !== 1 ? 's' : ''}
								<br /><span class="hint">{order.items.reduce((sum: number, oi: any) => sum + oi.quantity, 0)} total qty</span>
							</td>
							<td>
								{#if order.estimatedShippingCents}
									{formatCost(order.estimatedShippingCents)}
									{#if order.country === 'US' && order.estimatedDutiesCents}
										<span class="duties-badge">+ {formatCost(order.estimatedDutiesCents)} duties</span>
									{/if}
									<br /><span class="hint">{order.estimatedServiceName || '—'}</span>
								{:else}
									<span class="hint">Not estimated</span>
								{/if}
							</td>
							<td><span class="status-badge {statusClass(order.status)}">{statusLabel(order.status)}</span></td>
							<td>
								<div class="tags-cell">
									{#each order.tags as tagObj}
										<span class="tag">{tagObj.tag}</span>
									{/each}
								</div>
							</td>
							<td class="hint">{new Date(order.createdAt).toLocaleDateString()}</td>
							<td class="actions">
								<button type="button" class="action-btn" onclick={() => expandedOrder = expandedOrder === order.id ? null : order.id}>
									{expandedOrder === order.id ? 'Hide' : 'Details'}
								</button>
								{#if order.status === 'APPROVED' && !labelResults[order.id]}
									<button
										type="button"
										class="action-btn label-btn"
										onclick={() => getLabel(order.id)}
										disabled={labelLoading[order.id]}
									>
										{labelLoading[order.id] ? '⏳...' : order.labelUrl ? '🔄 Reprint' : '📦 Get Label'}
									</button>
								{/if}
								{#if order.status === 'SHIPPED' && !labelResults[order.id]}
									<button
										type="button"
										class="action-btn label-btn"
										onclick={() => getLabel(order.id)}
										disabled={labelLoading[order.id]}
									>
										{labelLoading[order.id] ? '⏳...' : '🖨️ Reprint'}
									</button>
								{/if}
							</td>
						</tr>
						{#if labelErrors[order.id]}
							<tr class="detail-row">
								<td colspan="10">
									<p class="label-error">✗ {labelErrors[order.id]}</p>
								</td>
							</tr>
						{/if}
						{#if labelResults[order.id]}
							<tr class="detail-row">
								<td colspan="10">
									<div class="label-result">
										<div class="label-result-info">
											<span class="label-method">{labelResults[order.id].shippingMethod === 'lettermail' ? '✉️ Lettermail' : labelResults[order.id].shippingMethod === 'chitchats' ? '🚀 Chit Chats' : '📦 Canada Post'}</span>
											{#if labelResults[order.id].trackingNumber}
												<span class="label-tracking">Tracking: <code>{labelResults[order.id].trackingNumber}</code></span>
											{/if}
											{#if order.country === 'US'}
												<span class="label-zonos">🇺🇸 Zonos DDP (duties billed separately)</span>
											{/if}
										</div>
										<div class="label-actions">
											<button type="button" class="action-btn print-btn" onclick={() => printAll(labelResults[order.id])}>
												🖨️ Print
											</button>
											{#if labelResults[order.id].labelUrl}
												<a
													class="action-btn download-btn"
													href={labelResults[order.id].labelUrl}
													download={`label-${order.fulfillmentId}.pdf`}
												>📥 Label</a>
											{/if}
											{#if labelResults[order.id].packingSlipBase64}
												<a
													class="action-btn download-btn"
													href={`data:text/plain;base64,${labelResults[order.id].packingSlipBase64}`}
													download={`packing-slip-${order.fulfillmentId}.txt`}
												>📥 Slip</a>
											{/if}
										</div>
									</div>
								</td>
							</tr>
						{/if}
						{#if expandedOrder === order.id}
							<tr class="detail-row">
								<td colspan="10">
									<div class="detail-grid">
										<div class="detail-section">
											<h4>Recipient</h4>
											<p>{order.firstName} {order.lastName}</p>
											<p>{order.email}{order.phone ? ` · ${order.phone}` : ''}</p>
										</div>
										<div class="detail-section">
											<h4>Address</h4>
											<p>{order.addressLine1}</p>
											{#if order.addressLine2}<p>{order.addressLine2}</p>{/if}
											<p>{order.city}, {order.stateProvince} {order.postalCode || ''}</p>
											<p>{order.country}</p>
										</div>
										<div class="detail-section">
											<h4>Items</h4>
											{#each order.items as oi}
												<p>
													{oi.warehouseItem.name}
													{#if oi.sizingChoice}({oi.sizingChoice}){/if}
													× {oi.quantity}
												</p>
											{/each}
										</div>
										<div class="detail-section">
											<h4>Shipping</h4>
											{#if order.trackingNumber}
												<p>Tracking: <code>{order.trackingNumber}</code></p>
											{/if}
											{#if order.estimatedShippingCents}
												<p>Cost: {formatCost(order.estimatedShippingCents)} ({order.estimatedServiceName})</p>
											{:else}
												<p>Shipping: Not estimated</p>
											{/if}
											{#if order.estimatedTotalLengthIn}
												<p>Dimensions: {order.estimatedTotalLengthIn}×{order.estimatedTotalWidthIn}{order.estimatedPackageType !== 'flat' ? `×${order.estimatedTotalHeightIn}` : ''} in ({order.estimatedPackageType})</p>
												<p>Weight: {order.estimatedTotalWeightGrams}g</p>
											{/if}
										</div>
										{#if order.notes}
											<div class="detail-section">
												<h4>Notes</h4>
												<p>{order.notes}</p>
											</div>
										{/if}
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
	</section>
{/if}

<style>
	.filter-bar {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.status-filters,
	.tag-filters {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-wrap: wrap;
	}

	.filter-label {
		font-weight: 600;
		font-size: 0.8rem;
		color: #8492a6;
		white-space: nowrap;
		margin-right: 0.25rem;
	}

	.filter-btn {
		padding: 0.3rem 0.625rem;
		font-size: 0.75rem;
		background: rgba(255, 255, 255, 0.8);
		border: 1px solid #af98ff;
		color: #af98ff;
		border-radius: 20px;
		cursor: pointer;
		font-family: inherit;
	}

	.filter-btn:hover {
		background: rgba(255, 255, 255, 1);
	}

	.filter-btn.active {
		background: #af98ff;
		color: white;
	}

	.empty-state {
		text-align: center;
		padding: 3rem;
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #af98ff;
		border-radius: 16px;
	}

	.empty-state p {
		margin: 0 0 0.5rem 0;
	}

	.hint {
		color: #8492a6;
		font-size: 0.8rem;
	}

	.orders-section {
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #af98ff;
		border-radius: 16px;
		padding: 1.5rem;
	}

	.items-table-wrapper {
		overflow-x: auto;
	}

	.items-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.items-table th,
	.items-table td {
		text-align: left;
		padding: 0.75rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.items-table th {
		font-weight: 600;
		color: #8492a6;
		white-space: nowrap;
	}

	.item-name {
		font-weight: 500;
	}

	.fulfillment-id {
		background: #f0edff;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		font-size: 0.85rem;
		font-weight: 600;
		color: #6c5ce7;
		white-space: nowrap;
	}

	.status-badge {
		display: inline-block;
		padding: 0.2rem 0.5rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.status-draft { background: #f0f0f0; color: #8492a6; }
	.status-estimated { background: #e8f4ff; color: #338eda; }
	.status-approved { background: #e8fff0; color: #33d6a6; }
	.status-shipped { background: #f0e8ff; color: #af98ff; }
	.status-canceled { background: #ffe8ea; color: #ec3750; }

	.actions {
		white-space: nowrap;
	}

	.action-btn {
		margin-right: 0.375rem;
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		background: rgba(255, 255, 255, 0.8);
		border: 1px solid #af98ff;
		color: #af98ff;
		cursor: pointer;
		border-radius: 6px;
		font-family: inherit;
		white-space: nowrap;
	}

	.action-btn:hover {
		background: rgba(255, 255, 255, 1);
	}

	.detail-row td {
		padding: 1rem;
		background: rgba(175, 152, 255, 0.05);
	}

	.detail-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.detail-section h4 {
		margin: 0 0 0.375rem 0;
		font-size: 0.8rem;
		color: #8492a6;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.detail-section p {
		margin: 0 0 0.25rem 0;
		font-size: 0.875rem;
	}

	.tags-cell {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		align-items: center;
	}

	.tag {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		padding: 0.2rem 0.45rem;
		background: #f0edff;
		color: #6c5ce7;
		border-radius: 4px;
		font-size: 0.7rem;
	}

	.qz-status-bar {
		margin-bottom: 0.75rem;
	}

	.qz-indicator {
		display: inline-block;
		padding: 0.375rem 0.75rem;
		border-radius: 20px;
		font-size: 0.8rem;
		font-weight: 500;
	}

	.qz-connecting { background: #fff8e1; color: #f59e0b; }
	.qz-connected { background: #e8fff0; color: #27ae60; }
	.qz-error { background: #ffe8ea; color: #ec3750; }
	.qz-error a { color: #ec3750; font-weight: 600; }

	.label-btn {
		background: #e8fff0 !important;
		border-color: #33d6a6 !important;
		color: #27ae60 !important;
	}

	.label-btn:hover:not(:disabled) {
		background: #d0ffe0 !important;
	}

	.label-btn:disabled {
		opacity: 0.6;
		cursor: wait;
	}

	.label-error {
		color: #ec3750;
		font-size: 0.85rem;
		margin: 0;
	}

	.label-result {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.label-result-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.label-method {
		font-weight: 600;
		font-size: 0.9rem;
	}

	.label-tracking {
		font-size: 0.85rem;
		color: #8492a6;
	}

	.label-tracking code {
		background: #f0edff;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		color: #6c5ce7;
		font-weight: 600;
	}

	.label-actions {
		display: flex;
		gap: 0.5rem;
	}

	.print-btn {
		background: #f0f7ff !important;
		border-color: #338eda !important;
		color: #338eda !important;
	}

	.print-btn:hover {
		background: #ddeeff !important;
	}

	.download-btn {
		background: #f0fff0 !important;
		border-color: #27ae60 !important;
		color: #27ae60 !important;
		text-decoration: none;
	}

	.download-btn:hover {
		background: #ddf5dd !important;
	}

	.duties-badge {
		font-size: 0.75rem;
		color: #e17055;
		font-weight: 500;
	}

	.label-zonos {
		font-size: 0.8rem;
		color: #e17055;
		font-weight: 500;
		background: #fff5f0;
		padding: 0.125rem 0.5rem;
		border-radius: 4px;
		border: 1px solid #fab1a0;
	}

	@media (max-width: 768px) {
		.detail-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
