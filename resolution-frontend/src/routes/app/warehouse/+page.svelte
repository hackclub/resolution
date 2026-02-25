<script lang="ts">
	import type { PageData } from './$types';
	import PlatformBackground from '$lib/components/PlatformBackground.svelte';
	import { enhance } from '$app/forms';

	let { data }: { data: PageData } = $props();

	let showAddForm = $state(false);
	let isSubmitting = $state(false);
	let confirmDelete = $state<string | null>(null);

	function formatCost(cents: number) {
		return `$${(cents / 100).toFixed(2)}`;
	}
</script>

<svelte:head>
	<title>Warehouse - Resolution</title>
</svelte:head>

<PlatformBackground>
	<div class="warehouse-container">
		<a href="/app" class="back-link">
			<img src="https://icons.hackclub.com/api/icons/8492a6/back" alt="Back" width="20" height="20" />
			Back to Dashboard
		</a>

		<header>
			<div class="header-top">
				<div>
					<h1>Warehouse</h1>
					<p class="subtitle">Inventory management</p>
				</div>
				{#if data.isAdmin}
					<button class="add-btn" onclick={() => showAddForm = !showAddForm}>
						<img src="https://icons.hackclub.com/api/icons/338eda/{showAddForm ? 'view-close' : 'add'}" alt="" width="18" height="18" />
						{showAddForm ? 'Cancel' : 'Add Item'}
					</button>
				{/if}
			</div>
		</header>

		{#if showAddForm && data.isAdmin}
			<section class="add-form-section">
				<h2>Add New Item</h2>
				<form
					method="POST"
					action="?/addItem"
					use:enhance={() => {
						isSubmitting = true;
						return async ({ update, result }) => {
							await update();
							isSubmitting = false;
							if (result.type === 'success') showAddForm = false;
						};
					}}
				>
					<div class="form-grid">
						<div class="form-field">
							<label for="name">Item Name</label>
							<input type="text" id="name" name="name" required placeholder="e.g. Hack Club T-Shirt" />
						</div>
						<div class="form-field">
							<label for="sku">SKU</label>
							<input type="text" id="sku" name="sku" required placeholder="e.g. HC-TSHIRT-BLK-M" />
						</div>
						<div class="form-field">
							<label for="sizing">Sizing</label>
							<input type="text" id="sizing" name="sizing" placeholder="e.g. S, M, L, XL" />
						</div>
						<div class="form-field">
							<label for="weightOz">Weight (oz)</label>
							<input type="number" id="weightOz" name="weightOz" required step="0.1" min="0" placeholder="e.g. 8.0" />
						</div>
						<div class="form-field">
							<label for="cost">Cost ($)</label>
							<input type="number" id="cost" name="cost" required step="0.01" min="0" placeholder="e.g. 12.50" />
						</div>
						<div class="form-field">
							<label for="quantity">Quantity</label>
							<input type="number" id="quantity" name="quantity" min="0" value="0" />
						</div>
					</div>
					<button type="submit" class="submit-btn" disabled={isSubmitting}>
						{isSubmitting ? 'Adding...' : 'Add Item'}
					</button>
				</form>
			</section>
		{/if}

		{#if data.items.length === 0}
			<div class="empty-state">
				<p>No items in the warehouse yet.</p>
				{#if data.isAdmin}
					<p class="hint">Click "Add Item" to start building your inventory.</p>
				{:else}
					<p class="hint">Items will appear here once an admin adds them.</p>
				{/if}
			</div>
		{:else}
			<section class="items-section">
				<div class="items-table-wrapper">
					<table class="items-table">
						<thead>
							<tr>
								<th>Name</th>
								<th>SKU</th>
								<th>Sizing</th>
								<th>Weight</th>
								<th>Cost</th>
								<th>Qty</th>
								{#if data.isAdmin}
									<th>Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each data.items as item (item.id)}
								<tr>
									<td class="item-name">{item.name}</td>
									<td><code>{item.sku}</code></td>
									<td>{item.sizing || '—'}</td>
									<td>{item.weightOz} oz</td>
									<td>{formatCost(item.costCents)}</td>
									<td>{item.quantity}</td>
									{#if data.isAdmin}
										<td class="actions">
											{#if confirmDelete === item.id}
												<form method="POST" action="?/deleteItem" use:enhance={() => {
													return async ({ update }) => {
														await update();
														confirmDelete = null;
													};
												}}>
													<input type="hidden" name="itemId" value={item.id} />
													<button type="submit" class="action-btn danger">Confirm</button>
													<button type="button" class="action-btn" onclick={() => confirmDelete = null}>Cancel</button>
												</form>
											{:else}
												<button type="button" class="action-btn danger" onclick={() => confirmDelete = item.id}>Delete</button>
											{/if}
										</td>
									{/if}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		{/if}
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
		margin-bottom: 2rem;
	}

	.header-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}

	h1 {
		font-size: 1.75rem;
		margin: 0 0 0.5rem 0;
	}

	h2 {
		font-size: 1.25rem;
		margin: 0 0 1rem 0;
	}

	.subtitle {
		color: #8492a6;
		margin: 0;
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

	.add-form-section {
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #af98ff;
		border-radius: 16px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.form-field label {
		font-size: 0.8rem;
		font-weight: 600;
		color: #8492a6;
	}

	.form-field input {
		padding: 0.5rem 0.75rem;
		border: 1px solid #af98ff;
		border-radius: 8px;
		font-family: inherit;
		font-size: 0.9rem;
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
		font-size: 0.875rem;
	}

	.items-section {
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

	code {
		background: #f0f0f0;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		font-size: 0.8rem;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.action-btn {
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

	@media (max-width: 768px) {
		.form-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
