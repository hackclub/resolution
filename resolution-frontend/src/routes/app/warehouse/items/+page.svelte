<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let expandedImage = $state<string | null>(null);

	function formatCost(cents: number) {
		return `$${(cents / 100).toFixed(2)}`;
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

{#if data.items.length === 0}
	<div class="empty-state">
		<p>No items in the warehouse yet.</p>
		<p class="hint">Items will appear here once they are added.</p>
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
									<td>{item.packageType === 'flat' ? `${item.lengthIn}×${item.widthIn} in (flat)` : `${item.lengthIn}×${item.widthIn}×${item.heightIn} in`}</td>
									<td>{item.weightGrams} g</td>
									<td>{formatCost(item.costCents)}</td>
									<td>{item.quantity}</td>
								</tr>
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
	.category-heading {
		font-size: 1rem;
		font-weight: 600;
		color: #338eda;
		margin: 0 0 0.75rem 0;
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
