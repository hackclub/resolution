<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';

	let { data }: { data: PageData } = $props();

	import { PATHWAY_LABELS } from '$lib/pathways';

	type UserWithRoles = PageData['users'][number] & {
		isAmbassador: boolean;
		isReviewer: boolean;
	};

	const ROLE_FILTERS = [
		{ value: 'all', label: 'All roles', match: () => true },
		{ value: 'admin', label: 'Admins', match: (u: UserWithRoles) => u.isAdmin },
		{ value: 'ambassador', label: 'Ambassadors', match: (u: UserWithRoles) => u.isAmbassador },
		{ value: 'reviewer', label: 'Reviewers', match: (u: UserWithRoles) => u.isReviewer },
		{ value: 'ysws', label: 'YSWS eligible', match: (u: UserWithRoles) => u.yswsEligible },
		{
			value: 'none',
			label: 'No role',
			match: (u: UserWithRoles) => !u.isAdmin && !u.isAmbassador && !u.isReviewer
		}
	] as const;

	type RoleFilterValue = (typeof ROLE_FILTERS)[number]['value'];

	let searchQuery = $state('');
	let roleFilter = $state<RoleFilterValue>('all');
	let confirmDelete = $state<string | null>(null);
	let ambassadorModal = $state<{ userId: string; userName: string } | null>(null);
	let reviewerModal = $state<{ userId: string; userName: string } | null>(null);

	const pathwayLabels = PATHWAY_LABELS;

	const activeRoleFilter = $derived(
		ROLE_FILTERS.find((f) => f.value === roleFilter) ?? ROLE_FILTERS[0]
	);

	const filteredUsers = $derived(
		data.users.filter((u) => {
			const matchesSearch =
				u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(u.firstName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
				(u.lastName?.toLowerCase() || '').includes(searchQuery.toLowerCase());

			if (!matchesSearch) return false;

			const userWithRoles: UserWithRoles = {
				...u,
				isAmbassador: getUserAmbassadorPathways(u.id).length > 0,
				isReviewer: getUserReviewerPathways(u.id).length > 0
			};

			return activeRoleFilter.match(userWithRoles);
		})
	);

	function getUserAmbassadorPathways(userId: string): string[] {
		return data.ambassadorsByUser[userId] || [];
	}

	function getUserReviewerPathways(userId: string): string[] {
		return data.reviewersByUser[userId] || [];
	}
</script>

<svelte:head>
	<title>Admin - Resolution</title>
</svelte:head>

<div class="admin-container">
		<header>
			<div>
				<h1>Admin Dashboard</h1>
				<a href="/app" class="back-link">← Back to App</a>
			</div>
		</header>

		<section class="analytics">
			<div class="stat-card">
				<span class="stat-value">{data.analytics.totalUsers}</span>
				<span class="stat-label">Total Users</span>
			</div>
			<div class="stat-card">
				<span class="stat-value">{data.analytics.activeEnrollments}</span>
				<span class="stat-label">Active Enrollments</span>
			</div>
			<div class="stat-card">
				<span class="stat-value">{data.analytics.completedWorkshops}</span>
				<span class="stat-label">Completed Workshops</span>
			</div>
			<div class="stat-card">
				<span class="stat-value">{data.analytics.shippedProjects}</span>
				<span class="stat-label">Shipped Projects</span>
			</div>
		</section>

		<section class="users-section">
			<div class="users-header">
				<h2>Users ({filteredUsers.length})</h2>
				<div class="filters">
					<select bind:value={roleFilter} class="role-filter" aria-label="Filter users by role or eligibility">
						{#each ROLE_FILTERS as filter (filter.value)}
							<option value={filter.value}>{filter.label}</option>
						{/each}
					</select>
					<input
						type="text"
						placeholder="Search users..."
						aria-label="Search users by name or email"
						bind:value={searchQuery}
						class="search-input"
					/>
				</div>
			</div>

			<div class="users-table-wrapper">
				<table class="users-table">
					<thead>
						<tr>
							<th>Name</th>
							<th>Email</th>
							<th>Slack ID</th>
							<th>Admin</th>
							<th>Ambassador</th>
							<th>Reviewer</th>
							<th>YSWS</th>
							<th>Joined</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each filteredUsers as u (u.id)}
							{@const userPathways = getUserAmbassadorPathways(u.id)}
							{@const reviewerPathways = getUserReviewerPathways(u.id)}
							<tr>
								<td>{u.firstName || ''} {u.lastName || ''}</td>
								<td>{u.email}</td>
								<td>{u.slackId || '-'}</td>
								<td>
									<span class="badge" class:admin={u.isAdmin}>{u.isAdmin ? 'Yes' : 'No'}</span>
								</td>
								<td>
									{#if userPathways.length > 0}
										<div class="pathway-badges">
											{#each userPathways as pathway}
												<span class="badge ambassador">{pathwayLabels[pathway]}</span>
											{/each}
										</div>
									{:else}
										<span class="badge">-</span>
									{/if}
								</td>
								<td>
									{#if reviewerPathways.length > 0}
										<div class="pathway-badges">
											{#each reviewerPathways as pathway}
												<span class="badge reviewer">{pathwayLabels[pathway]}</span>
											{/each}
										</div>
									{:else}
										<span class="badge">-</span>
									{/if}
								</td>
								<td>
									<span class="badge" class:eligible={u.yswsEligible}>{u.yswsEligible ? 'Yes' : 'No'}</span>
								</td>
								<td>{new Date(u.createdAt).toLocaleDateString()}</td>
								<td class="actions">
									<form method="POST" action="?/toggleAdmin" use:enhance>
										<input type="hidden" name="userId" value={u.id} />
										<button type="submit" class="action-btn">
											{u.isAdmin ? 'Remove Admin' : 'Make Admin'}
										</button>
									</form>
									<button type="button" class="action-btn ambassador-btn" onclick={() => ambassadorModal = { userId: u.id, userName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email }}>
										Ambassador
									</button>
									<button type="button" class="action-btn reviewer-btn" onclick={() => reviewerModal = { userId: u.id, userName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email }}>
										Reviewer
									</button>
									{#if confirmDelete === u.id}
										<form method="POST" action="?/deleteUser" use:enhance={() => {
											return async ({ update }) => {
												await update();
												confirmDelete = null;
											};
										}}>
											<input type="hidden" name="userId" value={u.id} />
											<button type="submit" class="action-btn danger">Confirm</button>
											<button type="button" class="action-btn" onclick={() => (confirmDelete = null)}>Cancel</button>
										</form>
									{:else}
										<button type="button" class="action-btn danger" onclick={() => (confirmDelete = u.id)}>Delete</button>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

	{#if ambassadorModal}
		{@const userPathways = getUserAmbassadorPathways(ambassadorModal.userId)}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal-overlay" role="button" tabindex="-1" onclick={() => ambassadorModal = null}>
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
			<div class="modal" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()}>
				<h3>Manage Ambassador: {ambassadorModal.userName}</h3>
				<p class="modal-subtitle">Assign pathways this user can edit</p>
				
				<div class="pathway-list">
					{#each data.pathways as pathway}
						{@const isAssigned = userPathways.includes(pathway)}
						<div class="pathway-item">
							<span class="pathway-name">{pathwayLabels[pathway]}</span>
							{#if isAssigned}
								<form method="POST" action="?/removeAmbassador" use:enhance>
									<input type="hidden" name="userId" value={ambassadorModal.userId} />
									<input type="hidden" name="pathway" value={pathway} />
									<button type="submit" class="action-btn danger">Remove</button>
								</form>
							{:else}
								<form method="POST" action="?/assignAmbassador" use:enhance>
									<input type="hidden" name="userId" value={ambassadorModal.userId} />
									<input type="hidden" name="pathway" value={pathway} />
									<button type="submit" class="action-btn assign">Assign</button>
								</form>
							{/if}
						</div>
					{/each}
				</div>

				<button class="close-btn" onclick={() => ambassadorModal = null}>Close</button>
			</div>
		</div>
	{/if}

	{#if reviewerModal}
		{@const userPathways = getUserReviewerPathways(reviewerModal.userId)}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal-overlay" role="button" tabindex="-1" onclick={() => reviewerModal = null}>
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
			<div class="modal" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()}>
				<h3>Manage Reviewer: {reviewerModal.userName}</h3>
				<p class="modal-subtitle">Assign pathways this user can review</p>
				
				<div class="pathway-list">
					{#each data.pathways as pathway}
						{@const isAssigned = userPathways.includes(pathway)}
						<div class="pathway-item">
							<span class="pathway-name">{pathwayLabels[pathway]}</span>
							{#if isAssigned}
								<form method="POST" action="?/removeReviewer" use:enhance>
									<input type="hidden" name="userId" value={reviewerModal.userId} />
									<input type="hidden" name="pathway" value={pathway} />
									<button type="submit" class="action-btn danger">Remove</button>
								</form>
							{:else}
								<form method="POST" action="?/assignReviewer" use:enhance>
									<input type="hidden" name="userId" value={reviewerModal.userId} />
									<input type="hidden" name="pathway" value={pathway} />
									<button type="submit" class="action-btn assign">Assign</button>
								</form>
							{/if}
						</div>
					{/each}
				</div>

				<button class="close-btn" onclick={() => reviewerModal = null}>Close</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.admin-container {
		min-height: 100vh;
		padding: 2rem;
		color: #1f2d3d;
		max-width: 1000px;
		margin: 0 auto;
		font-family: 'Phantom Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: #fff;
	}

	header {
		margin-bottom: 2rem;
	}

	h1 {
		font-size: 1.5rem;
		margin: 0 0 0.5rem;
	}

	h2 {
		font-size: 1.25rem;
		margin: 0;
	}

	.back-link {
		color: #8492a6;
		text-decoration: none;
		font-size: 0.875rem;
	}

	.back-link:hover {
		text-decoration: underline;
	}

	.analytics {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.stat-card {
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #af98ff;
		border-radius: 12px;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		color: #338eda;
	}

	.stat-label {
		font-size: 0.875rem;
		color: #8492a6;
		margin-top: 0.5rem;
	}

	.users-section {
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #af98ff;
		border-radius: 12px;
		padding: 1.5rem;
	}

	.users-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.filters {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.role-filter {
		padding: 0.5rem 1rem;
		border: 1px solid #af98ff;
		border-radius: 8px;
		font-family: inherit;
		background: rgba(255, 255, 255, 0.8);
		cursor: pointer;
	}

	.search-input {
		padding: 0.5rem 1rem;
		border: 1px solid #af98ff;
		border-radius: 8px;
		font-family: inherit;
		min-width: 200px;
	}

	.users-table-wrapper {
		overflow-x: auto;
	}

	.users-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.users-table th,
	.users-table td {
		text-align: left;
		padding: 0.75rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.users-table th {
		font-weight: 600;
		color: #8492a6;
		white-space: nowrap;
	}

	.badge {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		background: #f0f0f0;
		color: #8492a6;
	}

	.badge.admin {
		background: #ec3750;
		color: white;
	}

	.badge.eligible {
		background: #33d6a6;
		color: white;
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

	.action-btn.assign {
		border-color: #33d6a6;
		color: #33d6a6;
	}

	.action-btn.assign:hover {
		background: #33d6a6;
		color: white;
	}

	.action-btn.ambassador-btn {
		border-color: #338eda;
		color: #338eda;
	}

	.action-btn.ambassador-btn:hover {
		background: #338eda;
		color: white;
	}

	.badge.ambassador {
		background: #338eda;
		color: white;
		margin: 0.125rem;
	}

	.badge.reviewer {
		background: #ff8c37;
		color: white;
		margin: 0.125rem;
	}

	.action-btn.reviewer-btn {
		border-color: #ff8c37;
		color: #ff8c37;
	}

	.action-btn.reviewer-btn:hover {
		background: #ff8c37;
		color: white;
	}

	.pathway-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: white;
		border-radius: 16px;
		padding: 2rem;
		max-width: 400px;
		width: 90%;
	}

	.modal h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
	}

	.modal-subtitle {
		color: #8492a6;
		margin: 0 0 1.5rem 0;
		font-size: 0.875rem;
	}

	.pathway-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.pathway-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		background: #f8f9fa;
		border-radius: 8px;
	}

	.pathway-name {
		font-weight: 500;
	}

	.close-btn {
		width: 100%;
		padding: 0.75rem;
		background: #f0f0f0;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		font-family: inherit;
		font-weight: 500;
	}

	.close-btn:hover {
		background: #e0e0e0;
	}
</style>
