<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let expandedOrder = $state<string | null>(null);
	let activeTagFilter = $state<string | null>(null);
	let activeTab = $state<'unbatched' | 'batched'>('unbatched');

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

	const unbatchedOrders = $derived(
		data.orders.filter((o: any) => !o.batchId)
	);

	const batchedOrders = $derived(
		data.orders.filter((o: any) => !!o.batchId)
	);

	const currentOrders = $derived(
		activeTab === 'unbatched' ? unbatchedOrders : batchedOrders
	);

	const filteredOrders = $derived(
		activeTagFilter
			? currentOrders.filter((o: any) => o.tags.some((t: any) => t.tag === activeTagFilter))
			: currentOrders
	);
</script>

<div class="page-actions">
	<a href="/app/warehouse/orders/new" class="new-order-btn">+ New Order</a>
</div>

<div class="sub-tabs">
	<button
		class="sub-tab"
		class:active={activeTab === 'unbatched'}
		onclick={() => { activeTab = 'unbatched'; activeTagFilter = null; }}
	>Unbatched Orders ({unbatchedOrders.length})</button>
	<button
		class="sub-tab"
		class:active={activeTab === 'batched'}
		onclick={() => { activeTab = 'batched'; activeTagFilter = null; }}
	>Batched Orders ({batchedOrders.length})</button>
</div>

{#if data.allTags.length > 0}
	<section class="tags-filter">
		<span class="filter-label">Filter by tag:</span>
		<div class="tag-buttons">
			<button
				class="tag-filter-btn"
				class:active={!activeTagFilter}
				onclick={() => activeTagFilter = null}
			>All</button>
			{#each data.allTags as tag}
				<button
					class="tag-filter-btn"
					class:active={activeTagFilter === tag}
					onclick={() => activeTagFilter = activeTagFilter === tag ? null : tag}
				>{tag}</button>
			{/each}
		</div>
	</section>
{/if}

{#if filteredOrders.length === 0}
	<div class="empty-state">
		<p>No orders yet.</p>
		<p class="hint">Orders will appear here once they are created.</p>
	</div>
{:else}
	<section class="orders-section">
		<div class="items-table-wrapper">
			<table class="items-table">
				<thead>
					<tr>
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
					{#each filteredOrders as order (order.id)}
						<tr>
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
							</td>
						</tr>
						{#if expandedOrder === order.id}
							<tr class="detail-row">
								<td colspan="9">
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
											<h4>Estimated Package</h4>
											{#if order.estimatedTotalLengthIn}
												<p>Dimensions: {order.estimatedTotalLengthIn}×{order.estimatedTotalWidthIn}{order.estimatedPackageType !== 'flat' ? `×${order.estimatedTotalHeightIn}` : ''} in ({order.estimatedPackageType})</p>
												<p>Weight: {order.estimatedTotalWeightGrams}g</p>
											{/if}
											{#if order.estimatedShippingCents}
												<p>Shipping: {formatCost(order.estimatedShippingCents)} ({order.estimatedServiceName})</p>
											{:else}
												<p>Shipping: Not estimated</p>
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

	.tags-filter {
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #af98ff;
		border-radius: 12px;
		padding: 0.75rem 1.25rem;
		margin-bottom: 1rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.filter-label {
		font-weight: 600;
		font-size: 0.8rem;
		color: #8492a6;
		white-space: nowrap;
	}

	.tag-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.tag-filter-btn {
		padding: 0.3rem 0.625rem;
		font-size: 0.75rem;
		background: rgba(255, 255, 255, 0.8);
		border: 1px solid #af98ff;
		color: #af98ff;
		border-radius: 20px;
		cursor: pointer;
		font-family: inherit;
	}

	.tag-filter-btn:hover {
		background: rgba(255, 255, 255, 1);
	}

	.tag-filter-btn.active {
		background: #af98ff;
		color: white;
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

	.sub-tabs {
		display: flex;
		gap: 0;
		margin-bottom: 1rem;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		overflow: hidden;
		width: fit-content;
	}

	.sub-tab {
		padding: 0.5rem 1rem;
		font-size: 0.85rem;
		font-family: inherit;
		border: none;
		background: white;
		color: #8492a6;
		cursor: pointer;
		border-right: 1px solid #e0e0e0;
	}

	.sub-tab:last-child {
		border-right: none;
	}

	.sub-tab:hover {
		color: #1a1a2e;
	}

	.sub-tab.active {
		background: #338eda;
		color: white;
		font-weight: 600;
	}

	.page-actions {
		margin-bottom: 1rem;
	}

	.new-order-btn {
		display: inline-block;
		background: #338eda;
		color: white;
		text-decoration: none;
		border-radius: 8px;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-family: inherit;
	}

	.new-order-btn:hover {
		opacity: 0.9;
	}

	@media (max-width: 768px) {
		.detail-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
