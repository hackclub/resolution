<script lang="ts">
	import { browser } from '$app/environment';

	let { children } = $props();
	let dark = $state(false);

	if (browser) {
		dark = localStorage.getItem('dark') === '1';
	}

	function toggle() {
		dark = !dark;
		localStorage.setItem('dark', dark ? '1' : '0');
	}
</script>

<div class:dark>
	<button class="dark-toggle" onclick={toggle}>{dark ? '☀️' : '🌙'}</button>
	{@render children()}
</div>

<style>
	.dark-toggle {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		z-index: 999;
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0.25rem;
		line-height: 1;
	}

	.dark :global(.platform-bg) {
		background-color: #111 !important;
	}

	.dark :global(.bg-scroll) {
		display: none !important;
	}

	.dark :global(*) {
		color: #eee;
		border-color: #555;
	}

	.dark :global(.app-container) {
		color: #eee;
	}

	.dark :global(h1),
	.dark :global(h2) {
		color: #fff;
	}

	.dark :global(.option-card),
	.dark :global(.option-card.selected) {
		background: #2a2a2a !important;
		border-color: #7b6bbf;
	}

	.dark :global(.option-card:hover:not(:disabled)) {
		background: #333 !important;
	}

	.dark :global(.option-card .label) {
		color: #eee;
	}

	.dark :global(.option-card.selected.editing) {
		background: rgba(51, 214, 166, 0.15);
		border-color: #33d6a6;
	}

	.dark :global(button) {
		background: rgba(255, 255, 255, 0.1);
		color: #ccc;
	}

	.dark :global(button:hover:not(:disabled)) {
		background: rgba(255, 255, 255, 0.2);
	}

	.dark :global(.save-btn) {
		background: #33d6a6;
		color: #fff;
		border-color: #33d6a6;
	}

	.dark :global(.save-btn:hover:not(:disabled)) {
		background: #2bc299;
	}

	.dark :global(.admin-btn) {
		background: rgba(255, 255, 255, 0.1);
		color: #ec3750;
	}

	.dark :global(.ambassador-btn) {
		background: rgba(255, 255, 255, 0.1);
		color: #a633d6;
	}

	.dark :global(a) {
		color: #91c8ff;
	}

	.dark :global(input),
	.dark :global(textarea),
	.dark :global(select) {
		background: rgba(255, 255, 255, 0.08);
		color: #eee;
		border-color: #555;
	}

	.dark :global(table) {
		color: #eee;
	}

	.dark :global(th) {
		color: #ccc;
	}

	.dark :global(td) {
		color: #eee;
	}
</style>
