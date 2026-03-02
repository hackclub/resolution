<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data }: { data: PageData } = $props();

	let showAddForm = $state(false);
	let isSubmitting = $state(false);
	let confirmDelete = $state<string | null>(null);
	let imagePreview = $state<string | null>(null);
	let expandedImage = $state<string | null>(null);
	let editingItem = $state<string | null>(null);
	let editImagePreview = $state<string | null>(null);
	let isEditSubmitting = $state(false);
	let removeImage = $state(false);
	let addOptions = $state<string[]>(['']);
	let editOptions = $state<string[]>(['']);
	let showCategoryForm = $state(false);
	let confirmDeleteCategory = $state<string | null>(null);

	function formatCost(cents: number) {
		return `$${(cents / 100).toFixed(2)}`;
	}

	function handleImageChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = () => {
				imagePreview = reader.result as string;
			};
			reader.readAsDataURL(file);
		} else {
			imagePreview = null;
		}
	}

	function handleEditImageChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = () => {
				editImagePreview = reader.result as string;
			};
			reader.readAsDataURL(file);
		} else {
			editImagePreview = null;
		}
	}

	type CategoryType = typeof data.categories[number];

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

<div class="header-top">
	{#if data.isAdmin}
		<button class="add-btn" onclick={() => { showCategoryForm = !showCategoryForm; }}>
			<img src="https://icons.hackclub.com/api/icons/338eda/{showCategoryForm ? 'view-close' : 'folder-add'}" alt="" width="18" height="18" />
			{showCategoryForm ? 'Close' : 'Categories'}
		</button>
		<button class="add-btn" onclick={() => { showAddForm = !showAddForm; imagePreview = null; }}>
			<img src="https://icons.hackclub.com/api/icons/338eda/{showAddForm ? 'view-close' : 'add'}" alt="" width="18" height="18" />
			{showAddForm ? 'Cancel' : 'Add Item'}
		</button>
	{/if}
</div>

{#if showCategoryForm && data.isAdmin}
	<section class="category-section">
		<h2>Categories</h2>
		<form
			method="POST"
			action="?/addCategory"
			use:enhance={() => {
				return async ({ update }) => {
					await update();
				};
			}}
		>
			<div class="category-add-row">
				<input type="text" name="categoryName" placeholder="New category name" required />
				<button type="submit" class="submit-btn">Add</button>
			</div>
		</form>
		{#if data.categories.length > 0}
			<ul class="category-list">
				{#each data.categories as cat (cat.id)}
					<li>
						<span>{cat.name}</span>
						{#if confirmDeleteCategory === cat.id}
							<form method="POST" action="?/deleteCategory" use:enhance={() => {
								return async ({ update }) => {
									await update();
									confirmDeleteCategory = null;
								};
							}} class="inline-form">
								<input type="hidden" name="categoryId" value={cat.id} />
								<button type="submit" class="action-btn danger">Confirm</button>
								<button type="button" class="action-btn" onclick={() => confirmDeleteCategory = null}>Cancel</button>
							</form>
						{:else}
							<button type="button" class="action-btn danger" onclick={() => confirmDeleteCategory = cat.id}>Delete</button>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="hint">No categories yet.</p>
		{/if}
	</section>
{/if}

{#if showAddForm && data.isAdmin}
	<section class="add-form-section">
		<h2>Add New Item</h2>
		<form
			method="POST"
			action="?/addItem"
			enctype="multipart/form-data"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update, result }) => {
					await update();
					isSubmitting = false;
					if (result.type === 'success') {
						showAddForm = false;
						imagePreview = null;
						addOptions = [''];
					}
				};
			}}
		>
			<div class="form-grid">
				<div class="form-field">
					<label for="name">Item Name</label>
					<input type="text" id="name" name="name" required placeholder="e.g. Hack Club T-Shirt" />
				</div>
				<div class="form-field">
					<label for="sku">ID</label>
					<input type="text" id="sku" name="sku" required placeholder="e.g. HC-TSHIRT-BLK-M" />
				</div>
				<div class="form-field">
					<label for="categoryId">Category</label>
					<select id="categoryId" name="categoryId">
						<option value="">Uncategorized</option>
						{#each data.categories as cat}
							<option value={cat.id}>{cat.name}</option>
						{/each}
					</select>
				</div>
				<div class="form-field">
					<label>Options</label>
					<input type="hidden" name="sizing" value={addOptions.filter(o => o.trim()).join(', ')} />
					{#each addOptions as option, i}
						<div class="option-row">
							<input type="text" placeholder="e.g. S" bind:value={addOptions[i]} />
							{#if addOptions.length > 1}
								<button type="button" class="option-btn remove-btn" onclick={() => addOptions = addOptions.filter((_, idx) => idx !== i)}>−</button>
							{/if}
						</div>
					{/each}
					<button type="button" class="option-btn add-option-btn" onclick={() => addOptions = [...addOptions, '']}>+</button>
				</div>
				<div class="form-field">
					<label for="lengthIn">Length (in)</label>
					<input type="number" id="lengthIn" name="lengthIn" required step="0.1" min="0" placeholder="e.g. 10" />
				</div>
				<div class="form-field">
					<label for="widthIn">Width (in)</label>
					<input type="number" id="widthIn" name="widthIn" required step="0.1" min="0" placeholder="e.g. 8" />
				</div>
				<div class="form-field">
					<label for="heightIn">Height (in)</label>
					<input type="number" id="heightIn" name="heightIn" required step="0.1" min="0" placeholder="e.g. 2" />
				</div>
				<div class="form-field">
					<label for="weightGrams">Weight (g)</label>
					<input type="number" id="weightGrams" name="weightGrams" required step="0.1" min="0" placeholder="e.g. 227" />
				</div>
				<div class="form-field">
					<label for="cost">Cost ($)</label>
					<input type="number" id="cost" name="cost" required step="0.01" min="0" placeholder="e.g. 12.50" />
				</div>
				<div class="form-field">
					<label for="quantity">Quantity</label>
					<input type="number" id="quantity" name="quantity" min="0" value="0" />
				</div>
				<div class="form-field form-field-full">
					<label for="image">Photo</label>
					<input type="file" id="image" name="image" accept="image/jpeg,image/png,image/gif,image/webp" onchange={handleImageChange} />
					{#if imagePreview}
						<img src={imagePreview} alt="Preview" class="image-preview" />
					{/if}
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
	{#each groupedItems() as group}
		<section class="items-section">
			<h3 class="category-heading">{group.category?.name || 'Uncategorized'}</h3>
			{#if group.items.length === 0}
				<p class="hint">No items in this category.</p>
			{:else}
				<div class="items-table-wrapper">
					<table class="items-table">
						<thead>
							<tr>
								<th>Photo</th>
								<th>Name</th>
								<th>ID</th>
								<th>Options</th>
								<th>Dimensions</th>
								<th>Weight</th>
								<th>Cost</th>
								<th>Qty</th>
								{#if data.isAdmin}
									<th>Actions</th>
								{/if}
							</tr>
						</thead>
						<tbody>
							{#each group.items as item (item.id)}
								<tr>
									<td class="item-photo">
										{#if item.imageUrl}
											<button class="photo-thumb-btn" onclick={() => expandedImage = item.imageUrl}>
												<img src={item.imageUrl} alt={item.name} class="photo-thumb" />
											</button>
										{:else}
											<span class="no-photo">—</span>
										{/if}
									</td>
									<td class="item-name">{item.name}</td>
									<td><code>{item.sku}</code></td>
									<td>{item.sizing || '—'}</td>
									<td>{item.lengthIn}×{item.widthIn}×{item.heightIn} in</td>
									<td>{item.weightGrams} g</td>
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
												<button type="button" class="action-btn" onclick={() => { editingItem = item.id; editImagePreview = null; removeImage = false; editOptions = item.sizing ? item.sizing.split(',').map((s: string) => s.trim()) : ['']; }}>Edit</button>
												<button type="button" class="action-btn danger" onclick={() => confirmDelete = item.id}>Delete</button>
											{/if}
										</td>
									{/if}
								</tr>
								{#if editingItem === item.id && data.isAdmin}
									<tr class="edit-row">
										<td colspan={data.isAdmin ? 9 : 8}>
											<form
												method="POST"
												action="?/editItem"
												enctype="multipart/form-data"
												use:enhance={() => {
													isEditSubmitting = true;
													return async ({ update, result }) => {
														await update();
														isEditSubmitting = false;
														if (result.type === 'success') {
															editingItem = null;
															editImagePreview = null;
														}
													};
												}}
											>
												<input type="hidden" name="itemId" value={item.id} />
												<div class="form-grid">
													<div class="form-field">
														<label for="edit-name-{item.id}">Item Name</label>
														<input type="text" id="edit-name-{item.id}" name="name" required value={item.name} />
													</div>
													<div class="form-field">
														<label for="edit-sku-{item.id}">ID</label>
														<input type="text" id="edit-sku-{item.id}" name="sku" required value={item.sku} />
													</div>
													<div class="form-field">
														<label for="edit-category-{item.id}">Category</label>
														<select id="edit-category-{item.id}" name="categoryId">
															<option value="">Uncategorized</option>
															{#each data.categories as cat}
																<option value={cat.id} selected={item.categoryId === cat.id}>{cat.name}</option>
															{/each}
														</select>
													</div>
													<div class="form-field">
														<label>Options</label>
														<input type="hidden" name="sizing" value={editOptions.filter(o => o.trim()).join(', ')} />
														{#each editOptions as option, i}
															<div class="option-row">
																<input type="text" placeholder="e.g. S" bind:value={editOptions[i]} />
																{#if editOptions.length > 1}
																	<button type="button" class="option-btn remove-btn" onclick={() => editOptions = editOptions.filter((_, idx) => idx !== i)}>−</button>
																{/if}
															</div>
														{/each}
														<button type="button" class="option-btn add-option-btn" onclick={() => editOptions = [...editOptions, '']}>+</button>
													</div>
													<div class="form-field">
														<label for="edit-length-{item.id}">Length (in)</label>
														<input type="number" id="edit-length-{item.id}" name="lengthIn" required step="0.1" min="0" value={item.lengthIn} />
													</div>
													<div class="form-field">
														<label for="edit-width-{item.id}">Width (in)</label>
														<input type="number" id="edit-width-{item.id}" name="widthIn" required step="0.1" min="0" value={item.widthIn} />
													</div>
													<div class="form-field">
														<label for="edit-height-{item.id}">Height (in)</label>
														<input type="number" id="edit-height-{item.id}" name="heightIn" required step="0.1" min="0" value={item.heightIn} />
													</div>
													<div class="form-field">
														<label for="edit-weight-{item.id}">Weight (g)</label>
														<input type="number" id="edit-weight-{item.id}" name="weightGrams" required step="0.1" min="0" value={item.weightGrams} />
													</div>
													<div class="form-field">
														<label for="edit-cost-{item.id}">Cost ($)</label>
														<input type="number" id="edit-cost-{item.id}" name="cost" required step="0.01" min="0" value={(item.costCents / 100).toFixed(2)} />
													</div>
													<div class="form-field">
														<label for="edit-qty-{item.id}">Quantity</label>
														<input type="number" id="edit-qty-{item.id}" name="quantity" min="0" value={item.quantity} />
													</div>
													<div class="form-field form-field-full">
														<label for="edit-image-{item.id}">Photo (leave empty to keep current)</label>
														{#if removeImage}
															<input type="hidden" name="removeImage" value="true" />
														{/if}
														{#if !removeImage}
															<input type="file" id="edit-image-{item.id}" name="image" accept="image/jpeg,image/png,image/gif,image/webp" onchange={handleEditImageChange} />
														{/if}
														{#if editImagePreview}
															<div class="image-preview-wrapper">
																<img src={editImagePreview} alt="Preview" class="image-preview" />
																<button type="button" class="remove-image-btn" onclick={() => { editImagePreview = null; removeImage = true; }}>✕</button>
															</div>
														{:else if item.imageUrl && !removeImage}
															<div class="image-preview-wrapper">
																<img src={item.imageUrl} alt="Current" class="image-preview" />
																<button type="button" class="remove-image-btn" onclick={() => { removeImage = true; }}>✕</button>
															</div>
														{:else if removeImage}
															<p class="image-removed-hint">Image will be removed on save. <button type="button" class="undo-remove-btn" onclick={() => { removeImage = false; }}>Undo</button></p>
														{/if}
													</div>
												</div>
												<div class="edit-actions">
													<button type="submit" class="submit-btn" disabled={isEditSubmitting}>
														{isEditSubmitting ? 'Saving...' : 'Save Changes'}
													</button>
													<button type="button" class="action-btn" onclick={() => { editingItem = null; editImagePreview = null; }}>Cancel</button>
												</div>
											</form>
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>
	{/each}
{/if}

{#if expandedImage}
	<button class="lightbox" onclick={() => expandedImage = null}>
		<img src={expandedImage} alt="Expanded view" />
	</button>
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

	.category-section {
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #af98ff;
		border-radius: 16px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.category-add-row {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.category-add-row input {
		flex: 1;
		padding: 0.5rem 0.75rem;
		border: 1px solid #af98ff;
		border-radius: 8px;
		font-family: inherit;
		font-size: 0.9rem;
	}

	.category-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.category-list li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0;
		border-bottom: 1px solid #e0e0e0;
		font-size: 0.9rem;
	}

	.category-list li:last-child {
		border-bottom: none;
	}

	.inline-form {
		display: inline;
	}

	.category-heading {
		font-size: 1rem;
		font-weight: 600;
		color: #338eda;
		margin: 0 0 0.75rem 0;
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

	.form-field-full {
		grid-column: 1 / -1;
	}

	.form-field label {
		font-size: 0.8rem;
		font-weight: 600;
		color: #8492a6;
	}

	.form-field input,
	.form-field select {
		padding: 0.5rem 0.75rem;
		border: 1px solid #af98ff;
		border-radius: 8px;
		font-family: inherit;
		font-size: 0.9rem;
	}

	.form-field input[type="file"] {
		padding: 0.375rem;
		font-size: 0.8rem;
	}

	.image-preview {
		max-width: 200px;
		max-height: 150px;
		border-radius: 8px;
		border: 1px solid #af98ff;
		object-fit: cover;
		margin-top: 0.5rem;
	}

	.option-row {
		display: flex;
		gap: 0.375rem;
		align-items: center;
	}

	.option-row + .option-row {
		margin-top: 0.375rem;
	}

	.option-row input {
		flex: 1;
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
		margin-top: 0.375rem;
	}

	.image-preview-wrapper {
		position: relative;
		display: inline-block;
		margin-top: 0.5rem;
	}

	.remove-image-btn {
		position: absolute;
		top: -6px;
		right: -6px;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: #ec3750;
		color: white;
		border: 2px solid white;
		font-size: 0.7rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		line-height: 1;
	}

	.remove-image-btn:hover {
		background: #d32f2f;
	}

	.image-removed-hint {
		font-size: 0.8rem;
		color: #8492a6;
		margin: 0.5rem 0 0 0;
	}

	.undo-remove-btn {
		background: none;
		border: none;
		color: #338eda;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.8rem;
		padding: 0;
		text-decoration: underline;
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
		margin-bottom: 1rem;
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

	.edit-row td {
		padding: 1rem;
		background: rgba(175, 152, 255, 0.05);
	}

	.edit-actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

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

	@media (max-width: 768px) {
		.form-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
