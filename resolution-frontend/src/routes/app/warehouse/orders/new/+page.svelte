<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let firstName = $state('');
	let lastName = $state('');
	let email = $state('');
	let phone = $state('');

	let addressLine1 = $state('');
	let addressLine2 = $state('');
	let city = $state('');
	let stateProvince = $state('');
	let postalCode = $state('');
	let country = $state('US');

	let notes = $state('');
	let tags = $state('');

	let itemQuantities = $state<Record<string, number>>({});
	let itemSizing = $state<Record<string, string>>({});

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

	let selectedItems = $derived(() => {
		return data.items
			.filter((item) => (itemQuantities[item.id] || 0) > 0)
			.map((item) => ({
				warehouseItemId: item.id,
				quantity: itemQuantities[item.id],
				sizingChoice: itemSizing[item.id] || null
			}));
	});
</script>

<form method="POST" action="?/createOrder" use:enhance>
	<section class="card">
		<h3 class="section-heading">Recipient Info</h3>
		<div class="form-grid">
			<label class="field">
				<span class="label">First Name</span>
				<input type="text" name="firstName" bind:value={firstName} required />
			</label>
			<label class="field">
				<span class="label">Last Name</span>
				<input type="text" name="lastName" bind:value={lastName} required />
			</label>
		</div>
		<label class="field">
			<span class="label">Email</span>
			<input type="email" name="email" bind:value={email} required />
		</label>
		<label class="field">
			<span class="label">Phone</span>
			<input type="tel" name="phone" bind:value={phone} />
		</label>
	</section>

	<section class="card">
		<h3 class="section-heading">Shipping Address</h3>
		<label class="field">
			<span class="label">Address Line 1</span>
			<input type="text" name="addressLine1" bind:value={addressLine1} required />
		</label>
		<label class="field">
			<span class="label">Address Line 2</span>
			<input type="text" name="addressLine2" bind:value={addressLine2} />
		</label>
		<div class="form-grid">
			<label class="field">
				<span class="label">City</span>
				<input type="text" name="city" bind:value={city} required />
			</label>
			<label class="field">
				<span class="label">State / Province</span>
				<input type="text" name="stateProvince" bind:value={stateProvince} required />
			</label>
		</div>
		<div class="form-grid">
			<label class="field">
				<span class="label">Postal Code</span>
				<input type="text" name="postalCode" bind:value={postalCode} />
			</label>
			<label class="field">
				<span class="label">Country</span>
				<input type="text" name="country" bind:value={country} required />
			</label>
		</div>
	</section>

	<section class="card">
		<h3 class="section-heading">Select Items</h3>
		{#each groupedItems() as group}
			{#if group.items.length > 0}
				<h4 class="category-heading">{group.category?.name || 'Uncategorized'}</h4>
				<div class="items-table-wrapper">
					<table class="items-table">
						<thead>
							<tr>
								<th>Name</th>
								<th>SKU</th>
								<th>Sizing</th>
								<th>Quantity</th>
							</tr>
						</thead>
						<tbody>
							{#each group.items as item (item.id)}
								{@const sizingOptions = item.sizing ? item.sizing.split(',').map((s) => s.trim()) : []}
								{@const qty = itemQuantities[item.id] || 0}
								<tr>
									<td class="item-name">{item.name}</td>
									<td><code>{item.sku}</code></td>
									<td>
										{#if sizingOptions.length > 0}
											<select
												class="sizing-select"
												value={itemSizing[item.id] || ''}
												onchange={(e) => itemSizing[item.id] = (e.target as HTMLSelectElement).value}
												required={qty > 0}
											>
												<option value="">Select size</option>
												{#each sizingOptions as size}
													<option value={size}>{size}</option>
												{/each}
											</select>
										{:else}
											<span class="hint">—</span>
										{/if}
									</td>
									<td>
										<input
											type="number"
											class="qty-input"
											min="0"
											value={qty}
											oninput={(e) => itemQuantities[item.id] = parseInt((e.target as HTMLInputElement).value) || 0}
										/>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		{/each}
		<input type="hidden" name="items" value={JSON.stringify(selectedItems())} />
	</section>

	<section class="card">
		<h3 class="section-heading">Notes & Tags</h3>
		<label class="field">
			<span class="label">Notes</span>
			<textarea name="notes" bind:value={notes} rows="3"></textarea>
		</label>
		<label class="field">
			<span class="label">Tags</span>
			<input type="text" name="tags" bind:value={tags} placeholder="e.g. club-event, spring-2026" />
		</label>
	</section>

	<button type="submit" class="submit-btn">Place Order</button>
</form>

<style>
	form {
		display: flex;
		flex-direction: column;
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

	.category-heading {
		font-size: 1rem;
		font-weight: 600;
		color: #338eda;
		margin: 1rem 0 0.75rem 0;
	}

	.category-heading:first-of-type {
		margin-top: 0;
	}

	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
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

	input[type='text'],
	input[type='email'],
	input[type='tel'],
	textarea,
	select {
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 8px;
		font-size: 0.875rem;
		font-family: inherit;
		width: 100%;
		box-sizing: border-box;
	}

	textarea {
		resize: vertical;
	}

	.hint {
		color: #8492a6;
		font-size: 0.8rem;
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

	.sizing-select {
		width: auto;
		min-width: 100px;
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

	.submit-btn {
		background: #338eda;
		color: white;
		border: none;
		border-radius: 8px;
		padding: 0.625rem 1.5rem;
		font-size: 0.9rem;
		cursor: pointer;
		font-family: inherit;
		align-self: flex-start;
	}

	.submit-btn:hover {
		opacity: 0.9;
	}

	@media (max-width: 768px) {
		.form-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
