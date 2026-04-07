<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	let editingId: string | null = $state(null);
	let showCreate = $state(false);

	async function uploadImage(file: File): Promise<string | null> {
		const fd = new FormData();
		fd.append('file', file);
		fd.append('pathway', data.pathwayId);
		fd.append('kind', 'item');
		const res = await fetch('/api/shop/upload-image', { method: 'POST', body: fd });
		if (!res.ok) {
			alert('Upload failed');
			return null;
		}
		const { url } = await res.json();
		return url as string;
	}
</script>

<svelte:head><title>Shop · Ambassador</title></svelte:head>

<div class="wrap">
	<header>
		<a class="back" href="/app/ambassador">← Ambassador home</a>
		<h1>{data.pathwayId} Shop</h1>
		<nav>
			<a href="/app/ambassador/{data.pathwayId.toLowerCase()}/shop/settings">Currency settings</a>
			<a href="/app/ambassador/{data.pathwayId.toLowerCase()}/shop/balances">Participant balances</a>
			<a href="/app/ambassador/{data.pathwayId.toLowerCase()}/shop/orders">Orders</a>
		</nav>
	</header>

	<button class="primary" onclick={() => (showCreate = !showCreate)}>
		{showCreate ? 'Cancel' : '+ New item'}
	</button>

	{#if showCreate}
		<form
			method="POST"
			action="?/create"
			class="item-form"
			use:enhance={() => async ({ update }) => {
				await update();
				showCreate = false;
			}}
		>
			<h2>New item</h2>
			<label>Name<input name="name" required /></label>
			<label>Description<textarea name="description" rows="3"></textarea></label>
			<label>Cost ({data.shop.currencyName})<input name="costCurrency" type="number" min="0" required /></label>
			<label>
				Image
				<input
					type="file"
					accept="image/*"
					onchange={async (e) => {
						const target = e.currentTarget as HTMLInputElement;
						const file = target.files?.[0];
						if (!file) return;
						const url = await uploadImage(file);
						const hidden = target.form?.querySelector('input[name=imageUrl]') as HTMLInputElement;
						if (hidden && url) hidden.value = url;
					}}
				/>
				<input type="hidden" name="imageUrl" />
			</label>
			<label>
				Link to warehouse item (optional)
				<select name="warehouseItemId">
					<option value="">— None —</option>
					{#each data.warehouseItems as wi}
						<option value={wi.id}>{wi.name} ({wi.sku})</option>
					{/each}
				</select>
			</label>
			<label class="checkbox"><input type="checkbox" name="isActive" checked /> Active</label>
			{#if form?.error}<p class="error">{form.error}</p>{/if}
			<button type="submit">Create</button>
		</form>
	{/if}

	<div class="grid">
		{#each data.items as item}
			<div class="item">
				{#if editingId === item.id}
					<form
						method="POST"
						action="?/update"
						use:enhance={() => async ({ update }) => {
							await update();
							editingId = null;
						}}
					>
						<input type="hidden" name="itemId" value={item.id} />
						<label>Name<input name="name" value={item.name} required /></label>
						<label>Description<textarea name="description" rows="3">{item.description}</textarea></label>
						<label>Cost<input name="costCurrency" type="number" min="0" value={item.costCurrency} required /></label>
						<label>
							Image URL
							<input name="imageUrl" value={item.imageUrl ?? ''} placeholder="Upload via item creation, or paste URL" />
						</label>
						<label>
							Warehouse item
							<select name="warehouseItemId">
								<option value="">— None —</option>
								{#each data.warehouseItems as wi}
									<option value={wi.id} selected={wi.id === item.warehouseItemId}>
										{wi.name} ({wi.sku})
									</option>
								{/each}
							</select>
						</label>
						<label class="checkbox">
							<input type="checkbox" name="isActive" checked={item.isActive} /> Active
						</label>
						<div class="row">
							<button type="submit">Save</button>
							<button type="button" onclick={() => (editingId = null)}>Cancel</button>
						</div>
					</form>
				{:else}
					{#if item.imageUrl}<img src={item.imageUrl} alt={item.name} class="thumb" />{/if}
					<h3>{item.name}{#if !item.isActive} <span class="badge">hidden</span>{/if}</h3>
					<p class="cost">{item.costCurrency} {data.shop.currencyName}</p>
					{#if item.warehouseItemId}
						<p class="link">📦 linked to warehouse</p>
					{/if}
					<div class="row">
						<button type="button" onclick={() => (editingId = item.id)}>Edit</button>
						<form method="POST" action="?/delete" use:enhance>
							<input type="hidden" name="itemId" value={item.id} />
							<button type="submit" class="danger">Hide</button>
						</form>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.wrap { max-width: 1100px; margin: 0 auto; padding: 2rem; font-family: 'Kodchasan', sans-serif; }
	header { margin-bottom: 1rem; }
	.back { color: #8492a6; text-decoration: none; }
	h1 { margin: 0.5rem 0; }
	nav { display: flex; gap: 1rem; }
	nav a { color: #af98ff; text-decoration: none; font-size: 0.9rem; }
	.primary { padding: 0.6rem 1.2rem; background: #af98ff; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; margin: 1rem 0; }
	.item-form, .item form { display: flex; flex-direction: column; gap: 0.6rem; }
	.item-form { background: white; border: 2px solid #af98ff; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
	label { display: flex; flex-direction: column; font-size: 0.85rem; gap: 0.25rem; color: #4a4a5e; }
	.checkbox { flex-direction: row; align-items: center; gap: 0.5rem; }
	input, textarea, select { padding: 0.5rem; border: 1px solid #8492a6; border-radius: 6px; font: inherit; }
	.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
	.item { background: white; border: 2px solid #8492a6; border-radius: 12px; padding: 1rem; }
	.thumb { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; margin-bottom: 0.5rem; }
	.cost { color: #af98ff; font-weight: 600; margin: 0; }
	.link { color: #1d8a5b; font-size: 0.8rem; margin: 0.25rem 0 0; }
	.row { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
	button { padding: 0.4rem 0.8rem; border: 1px solid #8492a6; background: white; border-radius: 6px; cursor: pointer; font: inherit; }
	button.danger { color: #ec3750; border-color: #ec3750; }
	.badge { font-size: 0.7rem; padding: 0.1rem 0.4rem; background: #f4f4f8; border-radius: 4px; color: #8492a6; }
	.error { color: #ec3750; }
	h2 { margin: 0; }
	h3 { margin: 0; font-size: 1rem; }
</style>
