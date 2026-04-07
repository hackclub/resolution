<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	let { data, form }: { data: PageData; form: ActionData } = $props();
	let saving = $state(false);
	let iconUrl = $state(data.shop.currencyIconUrl ?? '');

	async function uploadIcon(file: File) {
		const fd = new FormData();
		fd.append('file', file);
		fd.append('pathway', data.pathwayId);
		fd.append('kind', 'currency');
		const res = await fetch('/api/shop/upload-image', { method: 'POST', body: fd });
		if (!res.ok) { alert('Upload failed'); return; }
		const { url } = await res.json();
		iconUrl = url;
	}
</script>

<svelte:head><title>Currency settings</title></svelte:head>

<div class="wrap">
	<a class="back" href="/app/ambassador/{data.pathwayId.toLowerCase()}/shop">← Shop</a>
	<h1>Currency settings</h1>

	<form
		method="POST"
		action="?/save"
		use:enhance={() => {
			saving = true;
			return async ({ update }) => {
				await update();
				saving = false;
			};
		}}
	>
		<label>Currency name<input name="currencyName" value={data.shop.currencyName} required /></label>
		<label>
			Currency icon
			<input type="file" accept="image/*" onchange={(e) => {
				const f = (e.currentTarget as HTMLInputElement).files?.[0];
				if (f) uploadIcon(f);
			}} />
		</label>
		<input type="hidden" name="currencyIconUrl" value={iconUrl} />
		{#if iconUrl}<img src={iconUrl} alt="icon preview" class="preview" />{/if}

		{#if form?.error}<p class="error">{form.error}</p>{/if}
		{#if form?.success}<p class="ok">Saved!</p>{/if}

		<button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
	</form>
</div>

<style>
	.wrap { max-width: 600px; margin: 0 auto; padding: 2rem; font-family: 'Kodchasan', sans-serif; }
	.back { color: #8492a6; text-decoration: none; }
	h1 { margin: 1rem 0; }
	form { display: flex; flex-direction: column; gap: 1rem; background: white; padding: 1.5rem; border: 2px solid #8492a6; border-radius: 12px; }
	label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; color: #4a4a5e; }
	input { padding: 0.5rem; border: 1px solid #8492a6; border-radius: 6px; font: inherit; }
	.preview { width: 64px; height: 64px; object-fit: cover; border-radius: 8px; }
	button { padding: 0.6rem; background: #af98ff; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
	.error { color: #ec3750; }
	.ok { color: #1d8a5b; }
</style>
