<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data }: { data: PageData } = $props();

	let showCreateForm = $state(false);
	let isSubmitting = $state(false);
	let confirmDelete = $state<string | null>(null);
	let expandedOrder = $state<string | null>(null);
	let orderLines = $state<Array<{ itemId: string; qty: number; sizing: string }>>([
		{ itemId: '', qty: 1, sizing: '' }
	]);

	function formatCost(cents: number) {
		return `$${(cents / 100).toFixed(2)}`;
	}

	function getItemById(id: string) {
		return data.items.find(i => i.id === id);
	}

	function getItemSizingOptions(itemId: string): string[] {
		const item = getItemById(itemId);
		if (!item?.sizing) return [];
		return item.sizing.split(',').map(s => s.trim()).filter(Boolean);
	}

	function addLine() {
		orderLines = [...orderLines, { itemId: '', qty: 1, sizing: '' }];
	}

	function removeLine(index: number) {
		orderLines = orderLines.filter((_, i) => i !== index);
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
</script>

<div class="header-top">
	<button class="add-btn" onclick={() => { showCreateForm = !showCreateForm; }}>
		<img src="https://icons.hackclub.com/api/icons/338eda/{showCreateForm ? 'view-close' : 'add'}" alt="" width="18" height="18" />
		{showCreateForm ? 'Cancel' : 'New Order'}
	</button>
</div>

{#if showCreateForm}
	<section class="create-form-section">
		<h2>Create Order</h2>
		<form
			method="POST"
			action="?/createOrder"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update, result }) => {
					await update();
					isSubmitting = false;
					if (result.type === 'success') {
						showCreateForm = false;
						orderLines = [{ itemId: '', qty: 1, sizing: '' }];
					}
				};
			}}
		>
			<h3 class="section-heading">Recipient</h3>
			<div class="form-grid">
				<div class="form-field">
					<label for="firstName">First Name</label>
					<input type="text" id="firstName" name="firstName" required placeholder="John" />
				</div>
				<div class="form-field">
					<label for="lastName">Last Name</label>
					<input type="text" id="lastName" name="lastName" required placeholder="Doe" />
				</div>
				<div class="form-field">
					<label for="email">Email</label>
					<input type="email" id="email" name="email" required placeholder="john@example.com" />
				</div>
				<div class="form-field">
					<label for="phone">Phone</label>
					<input type="tel" id="phone" name="phone" placeholder="+1 555-0100" />
				</div>
			</div>

			<h3 class="section-heading">Address</h3>
			<div class="form-grid">
				<div class="form-field form-field-full">
					<label for="addressLine1">Address Line 1</label>
					<input type="text" id="addressLine1" name="addressLine1" required placeholder="123 Main St" />
				</div>
				<div class="form-field form-field-full">
					<label for="addressLine2">Address Line 2</label>
					<input type="text" id="addressLine2" name="addressLine2" placeholder="Apt 4B" />
				</div>
				<div class="form-field">
					<label for="city">City</label>
					<input type="text" id="city" name="city" required placeholder="Toronto" />
				</div>
				<div class="form-field">
					<label for="stateProvince">State / Province</label>
					<input type="text" id="stateProvince" name="stateProvince" required placeholder="ON" />
				</div>
				<div class="form-field">
					<label for="postalCode">Postal / ZIP Code</label>
					<input type="text" id="postalCode" name="postalCode" placeholder="M5V 2T6" />
				</div>
				<div class="form-field">
					<label for="country">Country (2-letter code)</label>
					<input type="text" id="country" name="country" required placeholder="CA" maxlength="2" style="text-transform: uppercase;" />
				</div>
			</div>

			<h3 class="section-heading">Items</h3>
			<div class="order-lines">
				{#each orderLines as line, i}
					<div class="order-line">
						<input type="hidden" name="itemId_{i}" value={line.itemId} />
						<input type="hidden" name="qty_{i}" value={line.qty} />
						<input type="hidden" name="sizing_{i}" value={line.sizing} />
						<div class="line-item-select">
							<select bind:value={line.itemId} required>
								<option value="">Select item...</option>
								{#each data.items as item}
									<option value={item.id}>{item.name} ({item.sku})</option>
								{/each}
							</select>
						</div>
						{#if line.itemId && getItemSizingOptions(line.itemId).length > 0}
							<div class="line-sizing">
								<select bind:value={line.sizing}>
									<option value="">No option</option>
									{#each getItemSizingOptions(line.itemId) as opt}
										<option value={opt}>{opt}</option>
									{/each}
								</select>
							</div>
						{/if}
						<div class="line-qty">
							<input type="number" min="1" bind:value={line.qty} />
						</div>
						{#if orderLines.length > 1}
							<button type="button" class="option-btn remove-btn" onclick={() => removeLine(i)}>−</button>
						{/if}
					</div>
				{/each}
				<button type="button" class="option-btn add-option-btn" onclick={addLine}>+ Add Item</button>
			</div>

			<h3 class="section-heading">Notes</h3>
			<div class="form-field form-field-full">
				<textarea name="notes" rows="2" placeholder="Optional notes..."></textarea>
			</div>

			<button type="submit" class="submit-btn" disabled={isSubmitting}>
				{isSubmitting ? 'Creating...' : 'Create & Estimate'}
			</button>
		</form>
	</section>
{/if}

{#if data.orders.length === 0}
	<div class="empty-state">
		<p>No orders yet.</p>
		<p class="hint">Click "New Order" to create one.</p>
	</div>
{:else}
	<section class="orders-section">
		<div class="items-table-wrapper">
			<table class="items-table">
				<thead>
					<tr>
						<th>Recipient</th>
						<th>Destination</th>
						<th>Items</th>
						<th>Est. Shipping</th>
						<th>Package</th>
						<th>Status</th>
						<th>Created</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each data.orders as order (order.id)}
						<tr>
							<td>
								<span class="item-name">{order.firstName} {order.lastName}</span>
								<br /><span class="hint">{order.email}</span>
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
							<td>
								{#if order.estimatedTotalLengthIn}
									{order.estimatedTotalLengthIn}×{order.estimatedTotalWidthIn}{order.estimatedPackageType !== 'flat' ? `×${order.estimatedTotalHeightIn}` : ''} in
									<br /><span class="hint">{order.estimatedTotalWeightGrams}g · {order.estimatedPackageType}</span>
								{:else}
									<span class="hint">—</span>
								{/if}
							</td>
							<td><span class="status-badge {statusClass(order.status)}">{statusLabel(order.status)}</span></td>
							<td class="hint">{new Date(order.createdAt).toLocaleDateString()}</td>
							<td class="actions">
								<button type="button" class="action-btn" onclick={() => expandedOrder = expandedOrder === order.id ? null : order.id}>
									{expandedOrder === order.id ? 'Hide' : 'Details'}
								</button>
								{#if confirmDelete === order.id}
									<form method="POST" action="?/deleteOrder" use:enhance={() => {
										return async ({ update }) => { await update(); confirmDelete = null; };
									}}>
										<input type="hidden" name="orderId" value={order.id} />
										<button type="submit" class="action-btn danger">Confirm</button>
										<button type="button" class="action-btn" onclick={() => confirmDelete = null}>Cancel</button>
									</form>
								{:else}
									<button type="button" class="action-btn danger" onclick={() => confirmDelete = order.id}>Delete</button>
								{/if}
							</td>
						</tr>
						{#if expandedOrder === order.id}
							<tr class="detail-row">
								<td colspan="8">
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
	.header-top {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	h2 {
		font-size: 1.25rem;
		margin: 0 0 1rem 0;
	}

	.section-heading {
		font-size: 1rem;
		margin: 1.25rem 0 0.75rem 0;
		color: #1a1a2e;
	}

	.add-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: rgba(255, 255, 255, 0.8);
		border: 1px solid #338eda;
		color: #338eda;
		border-radius: 20px;
		font-family: 'Kodchasan', sans-serif;
		cursor: pointer;
		white-space: nowrap;
		font-size: 0.9rem;
	}

	.add-btn:hover {
		background: rgba(255, 255, 255, 1);
	}

	.create-form-section {
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #af98ff;
		border-radius: 16px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.form-field-full {
		grid-column: 1 / -1;
	}

	.form-field label {
		font-size: 0.8rem;
		color: #8492a6;
		font-weight: 500;
	}

	.form-field input,
	.form-field textarea {
		padding: 0.5rem 0.75rem;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		font-size: 0.9rem;
		font-family: inherit;
	}

	.form-field textarea {
		resize: vertical;
	}

	.order-lines {
		margin-bottom: 1rem;
	}

	.order-line {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.line-item-select {
		flex: 3;
	}

	.line-item-select select {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		font-size: 0.9rem;
		font-family: inherit;
	}

	.line-sizing {
		flex: 1;
	}

	.line-sizing select {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		font-size: 0.9rem;
		font-family: inherit;
	}

	.line-qty {
		flex: 0 0 60px;
	}

	.line-qty input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		font-size: 0.9rem;
		font-family: inherit;
		text-align: center;
	}

	.option-btn {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid #af98ff;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.8);
		color: #af98ff;
		font-size: 1rem;
		cursor: pointer;
		font-family: inherit;
		padding: 0;
		flex-shrink: 0;
	}

	.option-btn:hover {
		background: rgba(255, 255, 255, 1);
	}

	.remove-btn {
		border-color: #ec3750;
		color: #ec3750;
	}

	.remove-btn:hover {
		background: #ec3750;
		color: white;
	}

	.add-option-btn {
		width: auto;
		padding: 0.375rem 0.75rem;
		font-size: 0.8rem;
		margin-top: 0.25rem;
	}

	.submit-btn {
		padding: 0.625rem 1.5rem;
		background: #33d6a6;
		border: 1px solid #33d6a6;
		color: white;
		border-radius: 20px;
		font-family: 'Kodchasan', sans-serif;
		cursor: pointer;
		font-size: 0.9rem;
		margin-top: 1rem;
	}

	.submit-btn:hover:not(:disabled) {
		background: #2bc299;
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
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

	.actions :global(form) {
		display: inline;
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

	.action-btn.danger {
		border-color: #ec3750;
		color: #ec3750;
	}

	.action-btn.danger:hover {
		background: #ec3750;
		color: white;
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

	@media (max-width: 768px) {
		.form-grid {
			grid-template-columns: 1fr;
		}

		.detail-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
