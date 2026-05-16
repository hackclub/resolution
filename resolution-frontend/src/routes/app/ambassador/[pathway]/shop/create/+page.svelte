<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { PATHWAY_INFO } from '$lib/pathways';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let activeTab = $state<'custom' | 'warehouse' | 'template'>('custom');

	const info = $derived(PATHWAY_INFO[data.pathwayId]);
	const pathwaySlug = $derived(data.pathwayId.toLowerCase());
</script>

<svelte:head>
	<title>Add Shop Item - {info?.label ?? data.pathwayId}</title>
</svelte:head>

<div class="container">
	<a href="/app/ambassador/{pathwaySlug}/shop" class="back-link">
		<img src="https://icons.hackclub.com/api/icons/8492a6/back" alt="Back" width="20" height="20" />
		Back to Shop
	</a>

	<header>
		<h1>Add a Shop Item</h1>
		<p class="subtitle">Add an item that participants can spend their pathway currency on.</p>
	</header>

	{#if form?.success}
		<div class="alert success">
			Created item <strong>{form.item?.name}</strong>.
			<a href="/app/ambassador/{pathwaySlug}/shop">Back to shop</a>
		</div>
	{/if}

	<div class="tabs" role="tablist">
		<button
			type="button"
			role="tab"
			class:active={activeTab === 'custom'}
			onclick={() => (activeTab = 'custom')}
		>
			Custom item
		</button>
		<button
			type="button"
			role="tab"
			class:active={activeTab === 'warehouse'}
			onclick={() => (activeTab = 'warehouse')}
		>
			Warehouse item
		</button>
		<button
			type="button"
			role="tab"
			class:active={activeTab === 'template'}
			onclick={() => (activeTab = 'template')}
		>
			Warehouse template
		</button>
	</div>

	{#if activeTab === 'custom'}
		<section class="panel">
			<h2>Custom item</h2>
			<p class="help">A pure custom listing (e.g., a grant or a digital reward). You handle fulfillment manually.</p>

			<form method="POST" action="?/createCustom" use:enhance class="form">
				<label>
					<span>Name</span>
					<input name="name" maxlength="50" required />
				</label>
				<label>
					<span>Description</span>
					<textarea name="description" maxlength="2000" rows="3" required></textarea>
				</label>
				<label>
					<span>Image URL</span>
					<input name="imageUrl" type="url" required />
				</label>
				<div class="row">
					<label>
						<span>Price</span>
						<input name="price" type="number" min="0" required />
					</label>
					<label>
						<span>Stock</span>
						<input name="stock" type="number" min="0" required />
					</label>
				</div>
				<label class="checkbox">
					<input name="isActive" type="checkbox" value="true" />
					<span>List immediately (otherwise saved as inactive)</span>
				</label>
				<button class="btn btn-primary" type="submit">Create custom item</button>
			</form>
		</section>
	{:else if activeTab === 'warehouse'}
		<section class="panel">
			<h2>Warehouse item</h2>
			<p class="help">Link directly to a single warehouse item. Stock is pulled from the warehouse.</p>

			{#if data.warehouseItems.length === 0}
				<p class="empty">No warehouse items available.</p>
			{:else}
				<form method="POST" action="?/createWarehouse" use:enhance class="form">
					<label>
						<span>Warehouse item</span>
						<select name="id" required>
							<option value="">Pick a warehouse item…</option>
							{#each data.warehouseItems as wh (wh.id)}
								<option value={wh.id}>
									{wh.name} (SKU {wh.sku}, stock {wh.quantity})
								</option>
							{/each}
						</select>
					</label>
					<label>
						<span>Display name override (optional)</span>
						<input name="name" maxlength="50" placeholder="Defaults to warehouse name" />
					</label>
					<label>
						<span>Description</span>
						<textarea name="description" rows="3" required></textarea>
					</label>
					<label>
						<span>Image URL override (optional)</span>
						<input name="imageUrl" type="url" placeholder="Defaults to warehouse image" />
					</label>
					<label>
						<span>Price</span>
						<input name="price" type="number" min="0" required />
					</label>
					<label class="checkbox">
						<input name="isActive" type="checkbox" value="true" />
						<span>List immediately</span>
					</label>
					<button class="btn btn-primary" type="submit">Create warehouse item</button>
				</form>
			{/if}
		</section>
	{:else}
		<section class="panel">
			<h2>Warehouse template</h2>
			<p class="help">Link to a warehouse template (a bundle of items). Stock is computed from template components.</p>

			{#if data.warehouseTemplates.length === 0}
				<p class="empty">No warehouse templates available.</p>
			{:else}
				<form method="POST" action="?/createWarehouseTemplate" use:enhance class="form">
					<label>
						<span>Template</span>
						<select name="id" required>
							<option value="">Pick a template…</option>
							{#each data.warehouseTemplates as tpl (tpl.id)}
								<option value={tpl.id}>
									{tpl.name}{tpl.isPublic ? ' (public)' : ''}
								</option>
							{/each}
						</select>
					</label>
					<label>
						<span>Display name override (optional)</span>
						<input name="name" maxlength="50" placeholder="Defaults to template name" />
					</label>
					<label>
						<span>Description</span>
						<textarea name="description" maxlength="2000" rows="3" required></textarea>
					</label>
					<label>
						<span>Image URL</span>
						<input name="imageUrl" type="url" required />
					</label>
					<label>
						<span>Price</span>
						<input name="price" type="number" min="0" required />
					</label>
					<label class="checkbox">
						<input name="isActive" type="checkbox" value="true" />
						<span>List immediately</span>
					</label>
					<button class="btn btn-primary" type="submit">Create template item</button>
				</form>
			{/if}
		</section>
	{/if}
</div>

<style>
	.container {
		min-height: 100vh;
		padding: 2rem;
		color: #1f2d3d;
		max-width: 800px;
		margin: 0 auto;
		font-family: 'Phantom Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: #fff;
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
	.back-link:hover { color: #1a1a2e; }

	h1 { font-size: 1.75rem; margin: 0 0 0.5rem 0; }
	h2 { font-size: 1.15rem; margin: 0 0 0.25rem 0; }
	.subtitle, .help { color: #8492a6; margin: 0 0 1rem 0; font-size: 0.9rem; }

	.alert {
		padding: 0.75rem 1rem;
		border-radius: 12px;
		margin-bottom: 1rem;
		font-size: 0.9rem;
	}
	.alert.success {
		background: rgba(51, 214, 166, 0.15);
		border: 1px solid #33d6a6;
		color: #1a8c6a;
	}
	.alert a { color: inherit; text-decoration: underline; margin-left: 0.5rem; }

	.tabs {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 1rem;
		border-bottom: 1px solid #e1e4ec;
	}
	.tabs button {
		all: unset;
		padding: 0.5rem 1rem;
		font-family: inherit;
		font-size: 0.9rem;
		cursor: pointer;
		border-bottom: 2px solid transparent;
		color: #5a6c7d;
	}
	.tabs button.active {
		color: #a633d6;
		border-bottom-color: #a633d6;
		font-weight: 600;
	}

	.panel {
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #af98ff;
		border-radius: 16px;
		padding: 1.5rem;
	}

	.form { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }
	.row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
	label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; color: #5a6c7d; }
	label.checkbox {
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
		color: #1f2d3d;
	}
	input, textarea, select {
		font-family: inherit;
		font-size: 0.95rem;
		padding: 0.55rem 0.75rem;
		border-radius: 8px;
		border: 1px solid #d0d6df;
		background: #fff;
		color: #1f2d3d;
	}
	input:focus, textarea:focus, select:focus {
		outline: 2px solid #af98ff;
		border-color: #a633d6;
	}
	.empty { color: #8492a6; font-style: italic; }

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		padding: 0.6rem 1rem;
		border-radius: 20px;
		font-family: 'Kodchasan', sans-serif;
		font-size: 0.9rem;
		border: 1px solid transparent;
		cursor: pointer;
		text-decoration: none;
		align-self: flex-start;
	}
	.btn-primary { background: #a633d6; color: #fff; }
	.btn-primary:hover { background: #8a25b3; }
</style>
