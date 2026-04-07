<script lang="ts">
	import type { PageData } from './$types';
	import PlatformBackground from '$lib/components/PlatformBackground.svelte';
	import { enhance } from '$app/forms';
	import { PATHWAYS } from '$lib/pathways';

	let { data }: { data: PageData } = $props();

	const pathways = PATHWAYS;

	let selectedPathways = $state<string[]>([]);
	let isEditing = $state(true);
	let isSaving = $state(false);

	$effect(() => {
		selectedPathways = [...data.selectedPathways];
		isEditing = data.selectedPathways.length === 0;
	});

	function togglePathway(id: string) {
		if (!isEditing) return;

		if (selectedPathways.includes(id)) {
			selectedPathways = selectedPathways.filter((p) => p !== id);
		} else {
			selectedPathways = [...selectedPathways, id];
		}
	}

	function startEditing() {
		isEditing = true;
	}

	function cancelEditing() {
		selectedPathways = [...data.selectedPathways];
		isEditing = false;
	}
</script>

<svelte:head>
	<title>Dashboard - Resolution</title>
</svelte:head>

<PlatformBackground>
	<div class="app-container">
		<header>
			<h1>Welcome, {data.user.firstName || data.user.email}!</h1>
			<div class="header-actions">
				{#if data.isReviewer || data.user.isAdmin}
					<a href="/app/reviewer" class="reviewer-btn">Reviewer</a>
				{/if}
				{#if data.isAmbassador}
					<a href="/app/ambassador" class="ambassador-btn">Ambassador</a>
				{/if}
				{#if data.user.isAdmin}
					<a href="/app/admin" class="admin-btn">Admin</a>
				{/if}
				<form method="POST" action="/api/auth/logout">
					<button type="submit">Sign out</button>
				</form>
			</div>
		</header>

		<main>
			<div class="pathway-section">
				<div class="pathway-header">
					<h2>{isEditing ? 'Choose your pathways (You can change these later)' : 'Your Pathways'}</h2>
					{#if !isEditing && data.selectedPathways.length > 0}
						<button type="button" class="edit-btn" onclick={startEditing}>
							<img src="https://icons.hackclub.com/api/icons/8492a6/edit" alt="Edit" width="16" height="16" />
							Edit
						</button>
					{/if}
				</div>

				<div class="options-grid">
					{#each pathways as pathway}
						{@const isSelected = selectedPathways.includes(pathway.id)}
						{#if isEditing}
							<button
								type="button"
								class="option-card"
								class:selected={isSelected}
								class:editing={true}
								class:selectable={!isSelected}
								onclick={() => togglePathway(pathway.id)}
							>
								<img
									src="https://icons.hackclub.com/api/icons/{isSelected ? pathway.color : '8492a6'}/{pathway.icon}"
									alt={pathway.label}
									class="icon"
								/>
								<span class="label">{pathway.label}</span>
								{#if isSelected}
									<span class="check-badge">✓</span>
								{/if}
							</button>
						{:else if isSelected}
							<a
								href="/app/pathway/{pathway.id.toLowerCase()}"
								class="option-card selected"
							>
								<img
									src="https://icons.hackclub.com/api/icons/{pathway.color}/{pathway.icon}"
									alt={pathway.label}
									class="icon"
								/>
								<span class="label">{pathway.label}</span>
							</a>
						{/if}
					{/each}
				</div>

				{#if isEditing}
					<div class="action-buttons">
						<form
							method="POST"
							action="?/savePathways"
							use:enhance={() => {
								isSaving = true;
								return async ({ update }) => {
									await update();
									isSaving = false;
									isEditing = false;
								};
							}}
						>
							<input type="hidden" name="pathways" value={JSON.stringify(selectedPathways)} />
							{#if data.selectedPathways.length > 0}
								<button type="button" class="cancel-btn" onclick={cancelEditing} disabled={isSaving}>
									Cancel
								</button>
							{/if}
							<button type="submit" class="save-btn" disabled={selectedPathways.length === 0 || isSaving}>
								{isSaving ? 'Saving...' : 'Save Pathways'}
							</button>
						</form>
					</div>
				{/if}
			</div>
		</main>
	</div>
</PlatformBackground>

<style>
	.app-container {
		min-height: 100vh;
		padding: 2rem clamp(1rem, 4vw, 3rem);
		color: var(--color-text);
		display: flex;
		flex-direction: column;
		max-width: 1200px;
		margin: 0 auto;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.4rem;
		margin-bottom: 3rem;
		background: var(--gradient-card);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		backdrop-filter: blur(14px);
	}

	h1 {
		font-family: var(--font-display);
		font-size: 1.15rem;
		font-weight: 600;
		margin: 0;
		color: var(--color-text);
		letter-spacing: -0.01em;
	}

	h2 {
		font-family: var(--font-display);
		font-size: 1.6rem;
		font-weight: 700;
		margin: 0;
		color: var(--color-text);
		letter-spacing: -0.02em;
	}

	button {
		padding: 0.55rem 1.1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		color: var(--color-text-dim);
		cursor: pointer;
		border-radius: var(--radius-pill);
		font-family: inherit;
		font-size: 0.85rem;
		font-weight: 500;
		transition: all var(--transition-fast);
	}
	button:hover:not(:disabled) {
		background: var(--color-surface-2);
		color: var(--color-text);
		border-color: var(--color-border-strong);
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.admin-btn,
	.ambassador-btn,
	.reviewer-btn {
		padding: 0.55rem 1.1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		font-family: inherit;
		font-size: 0.85rem;
		font-weight: 500;
		text-decoration: none;
		transition: all var(--transition-fast);
	}
	.admin-btn { color: #ff7a8a; border-color: rgba(255, 122, 138, 0.35); }
	.ambassador-btn { color: #c89dff; border-color: rgba(200, 157, 255, 0.35); }
	.reviewer-btn { color: #ffb37a; border-color: rgba(255, 179, 122, 0.35); }
	.admin-btn:hover { background: rgba(255, 122, 138, 0.08); }
	.ambassador-btn:hover { background: rgba(200, 157, 255, 0.08); }
	.reviewer-btn:hover { background: rgba(255, 179, 122, 0.08); }

	main {
		flex: 1;
		display: flex;
		align-items: flex-start;
		justify-content: center;
	}

	.pathway-section {
		width: 100%;
		max-width: 980px;
	}

	.pathway-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		gap: 1rem;
	}

	.edit-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}
	.edit-btn img { filter: invert(0.8); }

	.options-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.2rem;
		width: 100%;
	}

	.option-card {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.1rem;
		padding: 2.5rem 1.6rem;
		background: var(--gradient-card);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		cursor: pointer;
		transition: all var(--transition-normal);
		font-family: inherit;
		text-decoration: none;
		overflow: hidden;
		backdrop-filter: blur(12px);
	}
	.option-card::before {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(circle at 50% 0%, rgba(255, 214, 107, 0.16), transparent 60%);
		opacity: 0;
		transition: opacity var(--transition-normal);
		pointer-events: none;
	}
	.option-card:hover {
		transform: translateY(-4px);
		border-color: var(--color-gold);
		box-shadow: var(--shadow-card);
	}
	.option-card:hover::before { opacity: 1; }

	.option-card.selected {
		border-color: var(--color-gold);
		background: rgba(255, 214, 107, 0.06);
	}
	.option-card.selected.editing {
		border-color: var(--color-green);
		background: rgba(74, 222, 128, 0.08);
	}
	.option-card.selectable {
		border-style: dashed;
	}

	.option-card .icon {
		width: 52px;
		height: 52px;
		filter: invert(1) brightness(1.4);
	}
	.option-card.selected .icon,
	.option-card:hover .icon {
		filter: none;
	}

	.option-card .label {
		font-family: var(--font-display);
		font-size: 1.05rem;
		font-weight: 600;
		color: var(--color-text);
		letter-spacing: -0.01em;
	}

	.check-badge {
		position: absolute;
		top: 0.85rem;
		right: 0.85rem;
		width: 26px;
		height: 26px;
		background: var(--color-green);
		color: var(--color-bg-deep);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.9rem;
		font-weight: 700;
		box-shadow: 0 0 16px rgba(74, 222, 128, 0.5);
	}

	.action-buttons {
		margin-top: 2.5rem;
		display: flex;
		justify-content: center;
	}
	.action-buttons form {
		display: flex;
		gap: 0.8rem;
	}

	.save-btn {
		background: var(--gradient-gold);
		border-color: transparent;
		color: #1a1100;
		font-weight: 700;
		padding: 0.85rem 2rem;
		box-shadow: var(--shadow-glow-gold);
	}
	.save-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 0 36px rgba(255, 214, 107, 0.7);
	}
	.save-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.cancel-btn {
		padding: 0.85rem 2rem;
	}

	@media (max-width: 720px) {
		.options-grid { grid-template-columns: 1fr 1fr; }
		header { flex-direction: column; border-radius: var(--radius-lg); }
	}
	@media (max-width: 480px) {
		.options-grid { grid-template-columns: 1fr; }
	}
</style>
