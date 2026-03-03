<script lang="ts">
	import type { PageData } from './$types';
	import PlatformBackground from '$lib/components/PlatformBackground.svelte';
	import { enhance } from '$app/forms';

	let { data }: { data: PageData } = $props();

	const pathways = [
		{ id: 'PYTHON', label: 'Python', icon: 'terminal', color: 'ec3750' },
		{ id: 'RUST', label: 'Rust', icon: 'terminal', color: '338eda' },
		{ id: 'GAME_DEV', label: 'Game Dev', icon: 'controls', color: '33d6a6' },
		{ id: 'HARDWARE', label: 'Hardware', icon: 'settings', color: 'ff8c37' },
		{ id: 'DESIGN', label: 'Design', icon: 'idea', color: 'a633d6' },
		{ id: 'GENERAL_CODING', label: 'General Coding', icon: 'code', color: '5bc0de' }
	];

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
		padding: 2rem;
		color: #1a1a2e;
		display: flex;
		flex-direction: column;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	h1 {
		font-size: 1.5rem;
		margin: 0;
	}

	h2 {
		font-size: 1.25rem;
		margin: 0;
		color: #1a1a2e;
	}

	button {
		padding: 0.5rem 1rem;
		background: rgba(255, 255, 255, 0.8);
		border: 1px solid #af98ff;
		color: #af98ff;
		cursor: pointer;
		border-radius: 20px;
		font-family: 'Kodchasan', sans-serif;
	}

	button:hover:not(:disabled) {
		background: rgba(255, 255, 255, 1);
	}

	.header-actions {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}

	.admin-btn,
	.ambassador-btn {
		padding: 0.5rem 1rem;
		background: rgba(255, 255, 255, 0.8);
		border-radius: 20px;
		font-family: 'Kodchasan', sans-serif;
		text-decoration: none;
	}

	.admin-btn {
		border: 1px solid #ec3750;
		color: #ec3750;
	}

	.ambassador-btn {
		border: 1px solid #a633d6;
		color: #a633d6;
	}

	.admin-btn:hover,
	.ambassador-btn:hover {
		background: rgba(255, 255, 255, 1);
	}

	main {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.pathway-section {
		width: 100%;
		max-width: 900px;
	}

	.pathway-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.edit-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: rgba(255, 255, 255, 0.8);
		border: 1px solid #8492a6;
		color: #8492a6;
	}

	.options-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.5rem;
		width: 100%;
	}

	.option-card {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 2.5rem 2rem;
		background: rgba(255, 255, 255, 0.85);
		border: 2px solid #af98ff;
		border-radius: 16px;
		cursor: pointer;
		transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease, opacity 0.2s ease;
		font-family: 'Kodchasan', sans-serif;
		text-decoration: none;
	}

	.option-card:hover:not(:disabled) {
		transform: scale(1.08);
		background: rgba(255, 255, 255, 1);
	}

	.option-card.selected {
		border-color: #af98ff;
		background: rgba(255, 255, 255, 0.85);
	}

	.option-card.selected.editing {
		border-color: #33d6a6;
		background: rgba(51, 214, 166, 0.1);
	}

	.option-card.selectable {
		border-style: dashed;
	}

	.option-card .icon {
		width: 48px;
		height: 48px;
	}

	.option-card .label {
		font-size: 1.1rem;
		font-weight: 600;
		color: #1a1a2e;
	}

	.check-badge {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		width: 24px;
		height: 24px;
		background: #33d6a6;
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		font-weight: bold;
	}

	.action-buttons {
		margin-top: 2rem;
		display: flex;
		justify-content: center;
	}

	.action-buttons form {
		display: flex;
		gap: 1rem;
	}

	.save-btn {
		background: #33d6a6;
		border-color: #33d6a6;
		color: white;
		padding: 0.75rem 2rem;
	}

	.save-btn:hover:not(:disabled) {
		background: #2bc299;
	}

	.save-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.cancel-btn {
		background: transparent;
		border-color: #8492a6;
		color: #8492a6;
		padding: 0.75rem 2rem;
	}
</style>
