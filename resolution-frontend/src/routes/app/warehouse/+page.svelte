<script lang="ts">
	import type { PageData } from './$types';
	import PlatformBackground from '$lib/components/PlatformBackground.svelte';
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
	let addOptions = $state<string[]>(['']);
	let editOptions = $state<string[]>(['']);

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
					<button class="add-btn" onclick={() => { showAddForm = !showAddForm; imagePreview = null; }}>
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
							<label for="sku">SKU</label>
							<input type="text" id="sku" name="sku" required placeholder="e.g. HC-TSHIRT-BLK-M" />
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
			<section class="items-section">
				<div class="items-table-wrapper">
					<table class="items-table">
						<thead>
							<tr>
								<th>Photo</th>
								<th>Name</th>
								<th>SKU</th>
								<th>Options</th>
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
												<button type="button" class="action-btn" onclick={() => { editingItem = item.id; editImagePreview = null; editOptions = item.sizing ? item.sizing.split(',').map((s: string) => s.trim()) : ['']; }}>Edit</button>
												<button type="button" class="action-btn danger" onclick={() => confirmDelete = item.id}>Delete</button>
											{/if}
										</td>
									{/if}
								</tr>
								{#if editingItem === item.id && data.isAdmin}
									<tr class="edit-row">
										<td colspan={data.isAdmin ? 8 : 7}>
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
														<label for="edit-sku-{item.id}">SKU</label>
														<input type="text" id="edit-sku-{item.id}" name="sku" required value={item.sku} />
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
														<input type="file" id="edit-image-{item.id}" name="image" accept="image/jpeg,image/png,image/gif,image/webp" onchange={handleEditImageChange} />
														{#if editImagePreview}
															<img src={editImagePreview} alt="Preview" class="image-preview" />
														{:else if item.imageUrl}
															<img src={item.imageUrl} alt="Current" class="image-preview" />
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
			</section>
		{/if}
	</div>

	{#if expandedImage}
		<button class="lightbox" onclick={() => expandedImage = null}>
			<img src={expandedImage} alt="Expanded view" />
		</button>
	{/if}
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

	.form-field-full {
		grid-column: 1 / -1;
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
