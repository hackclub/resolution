<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Category editing state
	let editingCategoryId = $state<string | null>(null);
	let editCategoryName = $state('');
	let editCategorySortOrder = $state(0);

	// Item editing state
	let editingItemId = $state<string | null>(null);
	let editItem = $state({
		name: '',
		sku: '',
		categoryId: '',
		sizing: '',
		packageType: 'box' as 'box' | 'flat',
		lengthIn: 0,
		widthIn: 0,
		heightIn: 0,
		weightGrams: 0,
		costDollars: '',
		hsCode: '',
		quantity: 0,
		imageUrl: ''
	});

	let expandedImage = $state<string | null>(null);

	function formatCost(cents: number) {
		return `$${(cents / 100).toFixed(2)}`;
	}

	function startEditCategory(cat: (typeof data.categories)[number]) {
		editingCategoryId = cat.id;
		editCategoryName = cat.name;
		editCategorySortOrder = cat.sortOrder;
	}

	function cancelEditCategory() {
		editingCategoryId = null;
	}

	function startEditItem(item: (typeof data.items)[number]) {
		editingItemId = item.id;
		editItem = {
			name: item.name,
			sku: item.sku,
			categoryId: item.categoryId || '',
			sizing: item.sizing || '',
			packageType: item.packageType as 'box' | 'flat',
			lengthIn: item.lengthIn,
			widthIn: item.widthIn,
			heightIn: item.heightIn,
			weightGrams: item.weightGrams,
			costDollars: (item.costCents / 100).toFixed(2),
			hsCode: item.hsCode || '',
			quantity: item.quantity,
			imageUrl: item.imageUrl || ''
		};
	}

	function cancelEditItem() {
		editingItemId = null;
	}

	type CategoryType = (typeof data.categories)[number];

	let groupedItems = $derived(() => {
		const groups: { category: CategoryType | null; items: typeof data.items }[] = [];
		const categoryMap = new Map<string, typeof data.items>();
		const uncategorized: typeof data.items = [];

		for (const item of data.items) {
			if (item.categoryId) {
				const existing = categoryMap.get(item.categoryId) || [];
				existing.push(item);
				categoryMap.set(item.categoryId, existing);
			} else {
				uncategorized.push(item);
			}
		}

		for (const cat of data.categories) {
			groups.push({ category: cat, items: categoryMap.get(cat.id) || [] });
		}

		if (uncategorized.length > 0) {
			groups.push({ category: null, items: uncategorized });
		}

		return groups;
	});
</script>

<!-- ==================== CATEGORIES SECTION ==================== -->
<section class="card">
	<h2>Categories</h2>

	{#if data.categories.length === 0}
		<p class="hint">No categories yet.</p>
	{:else}
		<table class="data-table">
			<thead>
				<tr>
					<th>Name</th>
					<th>Sort Order</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each data.categories as cat (cat.id)}
					{#if editingCategoryId === cat.id}
						<tr>
							<td colspan="3">
								<form method="POST" action="?/updateCategory" use:enhance={() => { return async ({ update }) => { await update(); cancelEditCategory(); }; }}>
									<input type="hidden" name="id" value={cat.id} />
									<div class="inline-edit-row">
										<input type="text" name="name" bind:value={editCategoryName} required class="input" />
										<input type="number" name="sortOrder" bind:value={editCategorySortOrder} required class="input input-sm" />
										<button type="submit" class="btn btn-primary">Save</button>
										<button type="button" class="btn btn-secondary" onclick={cancelEditCategory}>Cancel</button>
									</div>
								</form>
							</td>
						</tr>
					{:else}
						<tr>
							<td>{cat.name}</td>
							<td>{cat.sortOrder}</td>
							<td class="actions-cell">
								<button class="btn btn-primary btn-sm" onclick={() => startEditCategory(cat)}>Edit</button>
								<form method="POST" action="?/deleteCategory" use:enhance class="inline-form">
									<input type="hidden" name="id" value={cat.id} />
									<button type="submit" class="btn btn-danger btn-sm">Delete</button>
								</form>
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	{/if}

	<h3 class="form-heading">Add Category</h3>
	<form method="POST" action="?/createCategory" use:enhance>
		<div class="form-row">
			<label>
				<span class="label-text">Name</span>
				<input type="text" name="name" required class="input" />
			</label>
			<label>
				<span class="label-text">Sort Order</span>
				<input type="number" name="sortOrder" value="0" required class="input input-sm" />
			</label>
			<button type="submit" class="btn btn-primary">Add Category</button>
		</div>
	</form>
</section>

<!-- ==================== ITEMS SECTION ==================== -->
<section class="card">
	<h2>Items</h2>

	{#if data.items.length === 0}
		<p class="hint">No items in the warehouse yet.</p>
	{:else}
		{#each groupedItems() as group}
			<div class="items-group">
				<h3 class="category-heading">{group.category?.name || 'Uncategorized'}</h3>
				{#if group.items.length === 0}
					<p class="hint">No items in this category.</p>
				{:else}
					<div class="items-table-wrapper">
						<table class="data-table">
							<thead>
								<tr>
									<th>Photo</th>
									<th>Name</th>
									<th>SKU</th>
									<th>Options</th>
									<th>Dimensions</th>
									<th>Weight</th>
									<th>Cost</th>
									<th>Qty</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								{#each group.items as item (item.id)}
									<tr>
										<td class="item-photo">
											{#if item.imageUrl}
												<button class="photo-thumb-btn" onclick={() => (expandedImage = item.imageUrl)}>
													<img src={item.imageUrl} alt={item.name} class="photo-thumb" />
												</button>
											{:else}
												<span class="no-photo">—</span>
											{/if}
										</td>
										<td class="item-name">{item.name}</td>
										<td><code>{item.sku}</code></td>
										<td>{item.sizing || '—'}</td>
										<td>
											{item.packageType === 'flat'
												? `${item.lengthIn}×${item.widthIn} in (flat)`
												: `${item.lengthIn}×${item.widthIn}×${item.heightIn} in`}
										</td>
										<td>{item.weightGrams} g</td>
										<td>{formatCost(item.costCents)}</td>
										<td>{item.quantity}</td>
										<td class="actions-cell">
											<button class="btn btn-primary btn-sm" onclick={() => startEditItem(item)}>Edit</button>
											<form method="POST" action="?/deleteItem" use:enhance class="inline-form">
												<input type="hidden" name="id" value={item.id} />
												<button type="submit" class="btn btn-danger btn-sm">Delete</button>
											</form>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		{/each}
	{/if}
</section>

<!-- ==================== EDIT ITEM MODAL ==================== -->
{#if editingItemId}
	<div class="modal-backdrop">
		<div class="modal card">
			<h3 class="form-heading">Edit Item</h3>
			<form method="POST" action="?/updateItem" use:enhance={() => { return async ({ update }) => { await update(); cancelEditItem(); }; }}>
				<input type="hidden" name="id" value={editingItemId} />
				<div class="form-grid">
					<label>
						<span class="label-text">Name</span>
						<input type="text" name="name" bind:value={editItem.name} required class="input" />
					</label>
					<label>
						<span class="label-text">SKU</span>
						<input type="text" name="sku" bind:value={editItem.sku} required class="input" />
					</label>
					<label>
						<span class="label-text">Category</span>
						<select name="categoryId" bind:value={editItem.categoryId} class="input">
							<option value="">— None —</option>
							{#each data.categories as cat}
								<option value={cat.id}>{cat.name}</option>
							{/each}
						</select>
					</label>
					<label>
						<span class="label-text">Sizing (e.g. S,M,L,XL)</span>
						<input type="text" name="sizing" bind:value={editItem.sizing} class="input" />
					</label>
					<label>
						<span class="label-text">Package Type</span>
						<select name="packageType" bind:value={editItem.packageType} class="input">
							<option value="box">Box</option>
							<option value="flat">Flat</option>
						</select>
					</label>
					<label>
						<span class="label-text">Length (in)</span>
						<input type="number" name="lengthIn" bind:value={editItem.lengthIn} class="input" />
					</label>
					<label>
						<span class="label-text">Width (in)</span>
						<input type="number" name="widthIn" bind:value={editItem.widthIn} class="input" />
					</label>
					<label>
						<span class="label-text">Height (in)</span>
						<input type="number" name="heightIn" bind:value={editItem.heightIn} class="input" />
					</label>
					<label>
						<span class="label-text">Weight (grams)</span>
						<input type="number" name="weightGrams" bind:value={editItem.weightGrams} class="input" />
					</label>
					<label>
						<span class="label-text">Cost ($)</span>
						<input type="number" name="costDollars" step="0.01" bind:value={editItem.costDollars} class="input" />
					</label>
					<label>
						<span class="label-text">HS Code</span>
						<input type="text" name="hsCode" bind:value={editItem.hsCode} required class="input" placeholder="e.g. 6109.10" />
					</label>
					<label>
						<span class="label-text">Quantity</span>
						<input type="number" name="quantity" bind:value={editItem.quantity} class="input" />
					</label>
					<label>
						<span class="label-text">Image URL</span>
						<input type="text" name="imageUrl" bind:value={editItem.imageUrl} class="input" />
					</label>
				</div>
				<div class="modal-actions">
					<button type="submit" class="btn btn-primary">Save</button>
					<button type="button" class="btn btn-secondary" onclick={cancelEditItem}>Cancel</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- ==================== CREATE ITEM FORM ==================== -->
<section class="card">
	<h2>Add New Item</h2>
	<form method="POST" action="?/createItem" use:enhance>
		<div class="form-grid">
			<label>
				<span class="label-text">Name</span>
				<input type="text" name="name" required class="input" />
			</label>
			<label>
				<span class="label-text">SKU</span>
				<input type="text" name="sku" required class="input" />
			</label>
			<label>
				<span class="label-text">Category</span>
				<select name="categoryId" class="input">
					<option value="">— None —</option>
					{#each data.categories as cat}
						<option value={cat.id}>{cat.name}</option>
					{/each}
				</select>
			</label>
			<label>
				<span class="label-text">Sizing (e.g. S,M,L,XL)</span>
				<input type="text" name="sizing" class="input" />
			</label>
			<label>
				<span class="label-text">Package Type</span>
				<select name="packageType" class="input">
					<option value="box">Box</option>
					<option value="flat">Flat</option>
				</select>
			</label>
			<label>
				<span class="label-text">Length (in)</span>
				<input type="number" name="lengthIn" value="0" class="input" />
			</label>
			<label>
				<span class="label-text">Width (in)</span>
				<input type="number" name="widthIn" value="0" class="input" />
			</label>
			<label>
				<span class="label-text">Height (in)</span>
				<input type="number" name="heightIn" value="0" class="input" />
			</label>
			<label>
				<span class="label-text">Weight (grams)</span>
				<input type="number" name="weightGrams" value="0" class="input" />
			</label>
			<label>
				<span class="label-text">Cost ($)</span>
				<input type="number" name="costDollars" step="0.01" value="0.00" class="input" />
			</label>
			<label>
				<span class="label-text">HS Code</span>
				<input type="text" name="hsCode" required class="input" placeholder="e.g. 6109.10" />
			</label>
			<label>
				<span class="label-text">Quantity</span>
				<input type="number" name="quantity" value="0" class="input" />
			</label>
			<label>
				<span class="label-text">Image URL</span>
				<input type="text" name="imageUrl" class="input" />
			</label>
		</div>
		<button type="submit" class="btn btn-primary" style="margin-top: 1rem;">Add Item</button>
	</form>
</section>

<!-- ==================== LIGHTBOX ==================== -->
{#if expandedImage}
	<button class="lightbox" onclick={() => (expandedImage = null)}>
		<img src={expandedImage} alt="Expanded view" />
	</button>
{/if}

<style>
	/* Card / Section */
	.card {
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #af98ff;
		border-radius: 16px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	/* Headings */
	h2 {
		font-size: 1.25rem;
		color: #338eda;
		margin: 0 0 1rem 0;
	}

	.category-heading {
		font-size: 1rem;
		font-weight: 600;
		color: #338eda;
		margin: 0 0 0.75rem 0;
	}

	.form-heading {
		font-size: 1rem;
		font-weight: 600;
		color: #338eda;
		margin: 1.5rem 0 0.75rem 0;
	}

	.hint {
		color: #8492a6;
		font-size: 0.875rem;
	}

	/* Data Table */
	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.data-table th,
	.data-table td {
		text-align: left;
		padding: 0.75rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.data-table th {
		font-weight: 600;
		color: #8492a6;
		white-space: nowrap;
	}

	.items-table-wrapper {
		overflow-x: auto;
	}

	.items-group {
		margin-bottom: 1.5rem;
	}

	.items-group:last-child {
		margin-bottom: 0;
	}

	/* Item cells */
	.item-name {
		font-weight: 500;
	}

	.item-photo {
		width: 60px;
	}

	.photo-thumb-btn {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
	}

	.photo-thumb {
		width: 48px;
		height: 48px;
		object-fit: cover;
		border-radius: 6px;
		border: 1px solid #e0e0e0;
	}

	.no-photo {
		color: #8492a6;
	}

	code {
		background: #f0f0f0;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		font-size: 0.8rem;
	}

	/* Actions */
	.actions-cell {
		white-space: nowrap;
	}

	.actions-cell :global(form) {
		display: inline;
	}

	.actions-cell .btn {
		margin-right: 0.25rem;
	}

	.inline-form {
		display: inline;
	}

	.inline-edit-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	/* Buttons */
	.btn {
		border: none;
		border-radius: 8px;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		cursor: pointer;
		font-family: inherit;
	}

	.btn-primary {
		background: #338eda;
		color: white;
	}

	.btn-primary:hover {
		opacity: 0.9;
	}

	.btn-danger {
		background: #ec3750;
		color: white;
	}

	.btn-danger:hover {
		opacity: 0.9;
	}

	.btn-secondary {
		background: #e0e0e0;
		color: #1a1a2e;
	}

	.btn-secondary:hover {
		background: #d0d0d0;
	}

	.btn-sm {
		padding: 0.35rem 0.75rem;
		font-size: 0.8rem;
	}

	/* Form inputs */
	.input {
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 8px;
		font-size: 0.875rem;
		font-family: inherit;
		width: 100%;
		box-sizing: border-box;
	}

	.input-sm {
		width: 80px;
	}

	.label-text {
		display: block;
		font-size: 0.8rem;
		font-weight: 600;
		color: #8492a6;
		margin-bottom: 0.25rem;
	}

	/* Form layouts */
	.form-row {
		display: flex;
		align-items: flex-end;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem;
	}

	/* Modal */
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 900;
		padding: 2rem;
	}

	.modal {
		max-width: 700px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	/* Lightbox */
	.lightbox {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		cursor: pointer;
		border: none;
		padding: 2rem;
	}

	.lightbox img {
		max-width: 90vw;
		max-height: 90vh;
		object-fit: contain;
		border-radius: 8px;
	}
</style>
