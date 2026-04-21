<script lang="ts">
	import type { PageData } from './$types';
	import PlatformBackground from '$lib/components/PlatformBackground.svelte';
	import { enhance } from '$app/forms';

	import { PATHWAY_INFO } from '$lib/pathways';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let selectedUserId = $state('');
	let selectedPathway = $state('');
	let selectedWeek = $state('');
	let reason = $state('');
	let expiresAt = $state('');

	const pathwayInfo = PATHWAY_INFO;
	const weeks = $derived(Array.from({ length: data.season.totalWeeks }, (_, i) => i + 1));

	const filteredUsers = $derived(
		searchQuery.length < 2
			? []
			: data.enrolledUsers.filter(
					(u) =>
						(u.firstName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
						(u.lastName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
						u.email.toLowerCase().includes(searchQuery.toLowerCase())
				)
	);

	function selectUser(userId: string, name: string) {
		selectedUserId = userId;
		searchQuery = name;
	}

	function clearUser() {
		selectedUserId = '';
		searchQuery = '';
	}

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	const canSubmit = $derived(
		selectedUserId && selectedPathway && selectedWeek && reason && expiresAt
	);
</script>

<svelte:head>
	<title>Submission Exceptions - Resolution</title>
</svelte:head>

<PlatformBackground>
	<div class="exceptions-container">
		<a href="/app/ambassador" class="back-link">
			<img
				src="https://icons.hackclub.com/api/icons/8492a6/back"
				alt="Back"
				width="20"
				height="20"
			/>
			Back to Ambassador Dashboard
		</a>

		<header>
			<h1>Submission Exceptions</h1>
			<p class="subtitle">Grant deadline extensions for {data.season.name}</p>
		</header>

		<!-- Create Exception Form -->
		<section class="card create-section">
			<h2>Create Exception</h2>
			<form
				method="POST"
				action="?/createException"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						selectedUserId = '';
						searchQuery = '';
						selectedPathway = '';
						selectedWeek = '';
						reason = '';
						expiresAt = '';
					};
				}}
				class="create-form"
			>
				<input type="hidden" name="userId" value={selectedUserId} />

				<div class="form-row">
					<div class="form-group user-picker">
						<label for="user-search">User</label>
						<div class="search-wrapper">
							<input
								id="user-search"
								type="text"
								placeholder="Search by name or email..."
								bind:value={searchQuery}
								onfocus={() => {
									if (selectedUserId) clearUser();
								}}
								autocomplete="off"
							/>
							{#if selectedUserId}
								<button type="button" class="clear-btn" onclick={clearUser}>×</button>
							{/if}
						</div>
						{#if searchQuery.length >= 2 && !selectedUserId}
							<div class="search-results">
								{#if filteredUsers.length === 0}
									<div class="search-empty">No users found</div>
								{:else}
									{#each filteredUsers.slice(0, 8) as u}
										<button
											type="button"
											class="search-result"
											onclick={() =>
												selectUser(
													u.id,
													[u.firstName, u.lastName].filter(Boolean).join(' ') ||
														u.email
												)}
										>
											<span class="result-name">
												{u.firstName || ''}
												{u.lastName || ''}
											</span>
											<span class="result-email">{u.email}</span>
										</button>
									{/each}
								{/if}
							</div>
						{/if}
					</div>

					<div class="form-group">
						<label for="pathway">Pathway</label>
						<select id="pathway" name="pathway" bind:value={selectedPathway} required>
							<option value="" disabled>Select pathway</option>
							{#each data.assignments as pathway}
								{@const info = pathwayInfo[pathway]}
								<option value={pathway}>{info.label}</option>
							{/each}
						</select>
					</div>

					<div class="form-group">
						<label for="weekNumber">Week</label>
						<select id="weekNumber" name="weekNumber" bind:value={selectedWeek} required>
							<option value="" disabled>Select week</option>
							{#each weeks as week}
								<option value={week}>Week {week}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="form-row">
					<div class="form-group" style="flex: 2">
						<label for="reason">Reason</label>
						<input
							id="reason"
							name="reason"
							type="text"
							placeholder="e.g. Traveling, medical absence..."
							bind:value={reason}
							required
						/>
					</div>
					<div class="form-group">
						<label for="expiresAt">Expires</label>
						<input
							id="expiresAt"
							name="expiresAt"
							type="date"
							bind:value={expiresAt}
							required
						/>
					</div>
					<button
						type="submit"
						class="btn btn-primary create-btn"
						disabled={!canSubmit}
					>
						<img
							src="https://icons.hackclub.com/api/icons/ffffff/add"
							alt=""
							width="16"
							height="16"
						/>
						Create
					</button>
				</div>
			</form>
		</section>

		<!-- Existing Exceptions -->
		{#if data.exceptions.length === 0}
			<div class="empty-state">
				<p>No exceptions have been created yet.</p>
				<p class="hint">Use the form above to grant a deadline extension.</p>
			</div>
		{:else}
			<section class="card">
				<h2>Active Exceptions ({data.exceptions.length})</h2>
				<div class="exceptions-list">
					{#each data.exceptions as exception}
						{@const info = pathwayInfo[exception.pathway]}
						<div class="exception-item" class:inactive={!exception.isActive}>
							<div class="exception-top">
								<div class="exception-info">
									<div class="exception-user">
										<strong>
											{exception.userName || ''}
											{exception.userLastName || ''}
										</strong>
										<span class="exception-email">{exception.userEmail}</span>
									</div>
									<div class="exception-meta">
										<span class="pathway-badge" style="color: #{info.color}; border-color: #{info.color}">
											{info.label}
										</span>
										<span>Week {exception.weekNumber}</span>
										<span class="status-badge" class:active={exception.isActive}>
											{exception.isActive ? 'Active' : 'Inactive'}
										</span>
										<span class="exception-date">
											Expires {formatDate(exception.expiresAt)}
										</span>
									</div>
									<div class="exception-reason">{exception.reason}</div>
								</div>
								<div class="exception-actions">
									<form method="POST" action="?/toggleException" use:enhance>
										<input type="hidden" name="exceptionId" value={exception.id} />
										<button
											type="submit"
											class="btn btn-small"
											class:btn-active={exception.isActive}
											class:btn-inactive={!exception.isActive}
										>
											{exception.isActive ? 'Deactivate' : 'Activate'}
										</button>
									</form>
									<form
										method="POST"
										action="?/deleteException"
										use:enhance
										onsubmit={(e) => {
											if (!confirm('Delete this exception? This cannot be undone.')) {
												e.preventDefault();
											}
										}}
									>
										<input type="hidden" name="exceptionId" value={exception.id} />
										<button type="submit" class="btn btn-small btn-danger">
											<img
												src="https://icons.hackclub.com/api/icons/ec3750/delete"
												alt=""
												width="14"
												height="14"
											/>
										</button>
									</form>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}
	</div>
</PlatformBackground>

<style>
	.exceptions-container {
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

	h1 {
		font-size: 1.75rem;
		margin: 0 0 0.5rem 0;
	}

	.subtitle {
		color: #8492a6;
		margin: 0;
	}

	h2 {
		font-size: 1.25rem;
		margin: 0;
	}

	.card {
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #af98ff;
		border-radius: 16px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	/* Create Form */
	.create-section h2 {
		margin-bottom: 1rem;
	}

	.create-form .form-row {
		display: flex;
		gap: 1rem;
		align-items: flex-end;
	}

	.form-row + .form-row {
		margin-top: 0.75rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		flex: 1;
		position: relative;
	}

	.form-group label {
		font-size: 0.85rem;
		font-weight: 600;
		color: #1a1a2e;
	}

	.form-group select,
	.form-group input {
		padding: 0.5rem 0.75rem;
		border: 1px solid #d0d0d0;
		border-radius: 8px;
		font-size: 0.9rem;
		font-family: 'Kodchasan', sans-serif;
		background: white;
		color: #1a1a2e;
	}

	.form-group select:focus,
	.form-group input:focus {
		outline: none;
		border-color: #af98ff;
	}

	/* User Picker */
	.user-picker {
		position: relative;
	}

	.search-wrapper {
		position: relative;
	}

	.search-wrapper input {
		width: 100%;
		box-sizing: border-box;
	}

	.clear-btn {
		position: absolute;
		right: 0.5rem;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		font-size: 1.1rem;
		color: #8492a6;
		cursor: pointer;
		padding: 0 0.25rem;
		line-height: 1;
	}

	.clear-btn:hover {
		color: #ec3750;
	}

	.search-results {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: white;
		border: 1px solid #d0d0d0;
		border-radius: 8px;
		max-height: 200px;
		overflow-y: auto;
		z-index: 10;
		margin-top: 2px;
	}

	.search-result {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: none;
		border: none;
		border-bottom: 1px solid #f0f0f0;
		cursor: pointer;
		text-align: left;
		font-family: 'Kodchasan', sans-serif;
		font-size: 0.85rem;
	}

	.search-result:last-child {
		border-bottom: none;
	}

	.search-result:hover {
		background: #f0f4f8;
	}

	.result-name {
		font-weight: 600;
		color: #1a1a2e;
	}

	.result-email {
		color: #8492a6;
		font-size: 0.8rem;
	}

	.search-empty {
		padding: 0.75rem;
		text-align: center;
		color: #8492a6;
		font-size: 0.85rem;
	}

	/* Buttons */
	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		border: none;
		cursor: pointer;
		font-family: 'Kodchasan', sans-serif;
		font-size: 0.85rem;
		font-weight: 600;
		border-radius: 20px;
		padding: 0.5rem 1rem;
		white-space: nowrap;
		transition: opacity 0.15s;
	}

	.create-btn {
		align-self: flex-end;
		margin-bottom: 0;
	}

	.btn:hover {
		opacity: 0.85;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary {
		background: #338eda;
		color: white;
	}

	.btn-small {
		padding: 0.35rem 0.75rem;
		font-size: 0.8rem;
	}

	.btn-active {
		background: #fff3e0;
		color: #ff8c37;
		border: 1px solid #ff8c37;
	}

	.btn-inactive {
		background: #e8f5e9;
		color: #33d6a6;
		border: 1px solid #33d6a6;
	}

	.btn-danger {
		background: #ffeef0;
		color: #ec3750;
		border: 1px solid #ec3750;
	}

	/* Empty State */
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

	/* Exceptions List */
	.exceptions-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-top: 1.25rem;
	}

	.exception-item {
		background: white;
		border: 2px solid #e0e0e0;
		border-radius: 12px;
		padding: 1rem;
		transition: border-color 0.15s;
	}

	.exception-item:hover {
		border-color: #af98ff;
	}

	.exception-item.inactive {
		opacity: 0.65;
	}

	.exception-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}

	.exception-info {
		flex: 1;
		min-width: 0;
	}

	.exception-user {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		margin-bottom: 0.375rem;
	}

	.exception-email {
		color: #8492a6;
		font-size: 0.8rem;
	}

	.exception-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		font-size: 0.8rem;
		color: #8492a6;
		margin-bottom: 0.375rem;
	}

	.pathway-badge {
		padding: 0.125rem 0.5rem;
		border-radius: 10px;
		font-size: 0.75rem;
		font-weight: 600;
		border: 1px solid;
		background: white;
	}

	.status-badge {
		padding: 0.125rem 0.5rem;
		border-radius: 10px;
		font-size: 0.75rem;
		font-weight: 600;
		background: #ffeef0;
		color: #ec3750;
	}

	.status-badge.active {
		background: #e8f5e9;
		color: #33d6a6;
	}

	.exception-reason {
		font-size: 0.85rem;
		color: #1a1a2e;
		font-style: italic;
	}

	.exception-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	@media (max-width: 768px) {
		.create-form .form-row {
			flex-direction: column;
			align-items: stretch;
		}

		.create-btn {
			align-self: stretch;
		}

		.exception-top {
			flex-direction: column;
		}

		.exception-actions {
			align-self: flex-start;
		}

		.exception-user {
			flex-direction: column;
			gap: 0.125rem;
		}
	}
</style>
