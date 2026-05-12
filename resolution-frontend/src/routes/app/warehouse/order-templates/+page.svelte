<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showCreateForm = $state(false);
	let templateName = $state('');
	let isPublic = $state(false);
	let itemQuantities = $state<Record<string, number>>({});
	let searchQuery = $state('');

	type ItemType = (typeof data.items)[number];

	let searchResults = $derived(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return [];
		return data.items.filter(
			(item) =>
				item.name.toLowerCase().includes(q) ||
				item.sku.toLowerCase().includes(q)
		);
	});

	let addedItems = $derived(() => {
		return data.items.filter((item) => (itemQuantities[item.id] || 0) > 0);
	});

	let selectedItems = $derived(() => {
		return data.items
			.filter((item) => (itemQuantities[item.id] || 0) > 0)
			.map((item) => ({
				warehouseItemId: item.id,
				quantity: itemQuantities[item.id]
			}));
	});

	function addItem(item: ItemType) {
		if (!itemQuantities[item.id] || itemQuantities[item.id] === 0) {
			itemQuantities[item.id] = 1;
		}
		searchQuery = '';
	}

	function resetForm() {
		templateName = '';
		isPublic = false;
		itemQuantities = {};
		searchQuery = '';
		showCreateForm = false;
	}

	let userTemplates = $derived(
		data.templates.filter((t: any) => t.createdById === data.userId)
	);

	let publicTemplates = $derived(
		data.templates.filter((t: any) => t.isPublic && t.createdById !== data.userId)
	);
</script>

<div class="page-actions">
	<button
		type="button"
		class="create-btn"
		onclick={() => showCreateForm = !showCreateForm}
	>
		{showCreateForm ? '✕ Cancel' : '+ Create Template'}
	</button>
</div>

{#if showCreateForm}
	<section class="card">
		<h3 class="section-heading">New Template</h3>
		<form
			method="POST"
			action="?/createTemplate"
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'success') {
						resetForm();
					}
					await update();
				};
			}}
		>
			<label class="field">
				<span class="label">Template Name</span>
				<input type="text" name="name" bind:value={templateName} required />
			</label>

			<label class="toggle-field">
				<input type="checkbox" bind:checked={isPublic} />
				<span class="toggle-label">Public template</span>
				<span class="hint">Public templates are visible to all ambassadors</span>
			</label>

			<h4 class="subsection-heading">Items</h4>
			<div class="search-wrapper">
				<input
					type="text"
					class="search-input"
					placeholder="Search items by name or SKU..."
					bind:value={searchQuery}
				/>
				{#if searchResults().length > 0}
					<ul class="search-dropdown">
						{#each searchResults() as item (item.id)}
							<li>
								<button type="button" class="search-result-btn" onclick={() => addItem(item)}>
									<span class="result-name">{item.name}</span>
									<code>{item.sku}</code>
								</button>
							</li>
						{/each}
					</ul>
				{:else if searchQuery.trim().length > 0}
					<div class="search-no-results">No items found</div>
				{/if}
			</div>

			{#if addedItems().length > 0}
				<div class="items-table-wrapper">
					<table class="items-table">
						<thead>
							<tr>
								<th>Name</th>
								<th>SKU</th>
								<th>Quantity</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each addedItems() as item (item.id)}
								{@const qty = itemQuantities[item.id] || 0}
								<tr>
									<td class="item-name">{item.name}</td>
									<td><code>{item.sku}</code></td>
									<td>
										<input
											type="number"
											class="qty-input"
											min="1"
											value={qty}
											oninput={(e) => { itemQuantities[item.id] = parseInt((e.target as HTMLInputElement).value) || 0; }}
										/>
									</td>
									<td>
										<button
											type="button"
											class="remove-btn"
											onclick={() => { itemQuantities[item.id] = 0; }}
										>✕</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="hint" style="margin-top: 1rem;">Search above to add items to your template.</p>
			{/if}

			<input type="hidden" name="isPublic" value={isPublic.toString()} />
			<input type="hidden" name="items" value={JSON.stringify(selectedItems())} />

			<div class="form-actions">
				<button type="submit" class="submit-btn" disabled={!templateName.trim() || addedItems().length === 0}>
					Create Template
				</button>
			</div>
		</form>
	</section>
{/if}

<section class="templates-section">
	<h3 class="section-heading">Your Templates</h3>
	{#if userTemplates.length === 0}
		<p class="hint">You haven't created any templates yet.</p>
	{:else}
		<div class="templates-grid">
			{#each userTemplates as template (template.id)}
				<div class="template-card">
					<div class="template-header">
						<h4 class="template-name">{template.name}</h4>
						{#if template.isPublic}
							<span class="public-badge">Public</span>
						{/if}
					</div>
					<ul class="template-items">
						{#each template.items as ti}
							<li>
								<span class="ti-name">{ti.warehouseItem.name}</span>
								<span class="ti-qty">× {ti.quantity}</span>
							</li>
						{/each}
					</ul>
					<div class="template-footer">
						<span class="hint">{new Date(template.createdAt).toLocaleDateString()}</span>
						<form method="POST" action="?/deleteTemplate" onsubmit={(e) => { if (!confirm('Are you sure you want to delete this template?')) e.preventDefault(); }} use:enhance>
							<input type="hidden" name="templateId" value={template.id} />
							<button type="submit" class="delete-btn">Delete</button>
						</form>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>

<section class="templates-section">
	<h3 class="section-heading">Public Templates</h3>
	{#if publicTemplates.length === 0}
		<p class="hint">No public templates from other users yet.</p>
	{:else}
		<div class="templates-grid">
			{#each publicTemplates as template (template.id)}
				<div class="template-card">
					<div class="template-header">
						<h4 class="template-name">{template.name}</h4>
						<span class="public-badge">Public</span>
					</div>
					<p class="template-author hint">by {template.createdBy.firstName ? `${template.createdBy.firstName} ${template.createdBy.lastName || ''}`.trim() : template.createdBy.email}</p>
					<ul class="template-items">
						{#each template.items as ti}
							<li>
								<span class="ti-name">{ti.warehouseItem.name}</span>
								<span class="ti-qty">× {ti.quantity}</span>
							</li>
						{/each}
					</ul>
					<div class="template-footer">
						<span class="hint">{new Date(template.createdAt).toLocaleDateString()}</span>
						{#if data.isAdmin}
							<form method="POST" action="?/deleteTemplate" onsubmit={(e) => { if (!confirm('Are you sure you want to delete this template?')) e.preventDefault(); }} use:enhance>
								<input type="hidden" name="templateId" value={template.id} />
								<button type="submit" class="delete-btn">Delete</button>
							</form>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</section>

<style>
	.page-actions {
		margin-bottom: 1rem;
	}

	.create-btn {
		display: inline-block;
		background: #338eda;
		color: white;
		border: none;
		border-radius: 8px;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-family: inherit;
		cursor: pointer;
	}

	.create-btn:hover {
		opacity: 0.9;
	}

	.card {
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #af98ff;
		border-radius: 16px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.section-heading {
		font-size: 1.1rem;
		color: #338eda;
		margin: 0 0 1rem 0;
	}

	.subsection-heading {
		font-size: 0.95rem;
		color: #338eda;
		margin: 1.25rem 0 0.75rem 0;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-bottom: 0.75rem;
	}

	.label {
		font-size: 0.8rem;
		font-weight: 600;
		color: #8492a6;
	}

	input[type='text'] {
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 8px;
		font-size: 0.875rem;
		font-family: inherit;
		width: 100%;
		box-sizing: border-box;
	}

	.hint {
		color: #8492a6;
		font-size: 0.8rem;
	}

	.toggle-field {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		cursor: pointer;
	}

	.toggle-field input[type='checkbox'] {
		width: 16px;
		height: 16px;
		accent-color: #af98ff;
		cursor: pointer;
	}

	.toggle-label {
		font-size: 0.875rem;
		font-weight: 500;
	}

	.search-wrapper {
		position: relative;
		margin-bottom: 1rem;
	}

	.search-input {
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 8px;
		font-size: 0.875rem;
		font-family: inherit;
		width: 100%;
		box-sizing: border-box;
	}

	.search-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: white;
		border: 1px solid #ccc;
		border-radius: 8px;
		margin-top: 4px;
		padding: 0;
		list-style: none;
		max-height: 200px;
		overflow-y: auto;
		z-index: 10;
	}

	.search-dropdown li {
		border-bottom: 1px solid #f0f0f0;
	}

	.search-dropdown li:last-child {
		border-bottom: none;
	}

	.search-result-btn {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.625rem 0.75rem;
		background: none;
		border: none;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.875rem;
		text-align: left;
	}

	.search-result-btn:hover {
		background: #f5f0ff;
	}

	.result-name {
		font-weight: 500;
	}

	.search-no-results {
		padding: 0.625rem 0.75rem;
		color: #8492a6;
		font-size: 0.85rem;
		margin-top: 4px;
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

	.qty-input {
		width: 70px;
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 8px;
		font-size: 0.875rem;
		font-family: inherit;
		text-align: center;
	}

	.remove-btn {
		background: none;
		border: none;
		color: #e74c3c;
		cursor: pointer;
		font-size: 1rem;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	.remove-btn:hover {
		background: #fdecea;
	}

	.form-actions {
		margin-top: 1.25rem;
	}

	.submit-btn {
		background: #338eda;
		color: white;
		border: none;
		border-radius: 8px;
		padding: 0.625rem 1.5rem;
		font-size: 0.9rem;
		font-family: inherit;
		cursor: pointer;
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.submit-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.templates-section {
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #af98ff;
		border-radius: 16px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.templates-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1rem;
	}

	.template-card {
		border: 1px solid #e0e0e0;
		border-radius: 12px;
		padding: 1rem 1.25rem;
		background: white;
	}

	.template-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.template-name {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
	}

	.public-badge {
		display: inline-block;
		padding: 0.15rem 0.5rem;
		background: #eee8ff;
		color: #5b3cc4;
		border-radius: 12px;
		font-size: 0.7rem;
		font-weight: 600;
	}

	.template-author {
		margin: 0 0 0.5rem 0;
	}

	.template-items {
		list-style: none;
		padding: 0;
		margin: 0 0 0.75rem 0;
	}

	.template-items li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.25rem 0;
		font-size: 0.85rem;
		border-bottom: 1px solid #f0f0f0;
	}

	.template-items li:last-child {
		border-bottom: none;
	}

	.ti-name {
		font-weight: 500;
	}

	.ti-qty {
		color: #8492a6;
		font-size: 0.8rem;
	}

	.template-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.delete-btn {
		background: none;
		border: 1px solid #e74c3c;
		color: #e74c3c;
		border-radius: 6px;
		padding: 0.25rem 0.625rem;
		font-size: 0.75rem;
		font-family: inherit;
		cursor: pointer;
	}

	.delete-btn:hover {
		background: #fdecea;
	}

	@media (max-width: 768px) {
		.templates-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
