<script lang="ts">
	import type { PageData } from './$types';
	import PlatformBackground from '$lib/components/PlatformBackground.svelte';

	import { PATHWAY_INFO, PATHWAY_IDS } from '$lib/pathways';

	let { data }: { data: PageData } = $props();

	interface Submission {
		id: string;
		firstName: string;
		lastName: string;
		email: string;
		pathway: string;
		week: number;
		description: string;
		codeUrl: string;
		playableUrl: string;
		screenshotUrl: string | null;
		hackatimeProject: string;
		githubUsername: string;
		hoursSpent: number | null;
		submittedAt: string;
	}

	const pathwayInfo = PATHWAY_INFO;

	const allPathways = PATHWAY_IDS;
	const availablePathways = $derived(data.isAdmin ? allPathways : data.assignments);

	let submissions = $state<Submission[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state('');
	let pathwayFilter = $state('');

	let approveModal = $state<Submission | null>(null);
	let rejectModal = $state<Submission | null>(null);
	let approveHours = $state(0.5);
	let approveJustification = $state('');
	let rejectReason = $state('');
	let isActionLoading = $state(false);

	$effect(() => {
		fetchSubmissions(pathwayFilter);
	});

	async function fetchSubmissions(pathway: string) {
		isLoading = true;
		errorMessage = '';
		try {
			const url = pathway ? `/api/review/submissions?pathway=${pathway}` : '/api/review/submissions';
			const res = await fetch(url);
			if (!res.ok) {
				const result = await res.json();
				errorMessage = result.error || 'Failed to fetch submissions';
				return;
			}
			submissions = await res.json();
		} catch {
			errorMessage = 'Network error';
		} finally {
			isLoading = false;
		}
	}

	function openApprove(submission: Submission) {
		approveModal = submission;
		approveHours = submission.hoursSpent ?? 0.5;
		approveJustification = '';
	}

	function openReject(submission: Submission) {
		rejectModal = submission;
		rejectReason = '';
	}

	async function handleApprove() {
		if (!approveModal) return;
		isActionLoading = true;
		try {
			const res = await fetch('/api/review/approve', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					recordId: approveModal.id,
					hours: approveHours,
					justification: approveJustification
				})
			});
			if (!res.ok) {
				const result = await res.json();
				errorMessage = result.error || 'Failed to approve';
				return;
			}
			submissions = submissions.filter(s => s.id !== approveModal!.id);
			approveModal = null;
		} catch {
			errorMessage = 'Network error';
		} finally {
			isActionLoading = false;
		}
	}

	async function handleReject() {
		if (!rejectModal) return;
		isActionLoading = true;
		try {
			const res = await fetch('/api/review/reject', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					recordId: rejectModal.id,
					reason: rejectReason
				})
			});
			if (!res.ok) {
				const result = await res.json();
				errorMessage = result.error || 'Failed to reject';
				return;
			}
			submissions = submissions.filter(s => s.id !== rejectModal!.id);
			rejectModal = null;
		} catch {
			errorMessage = 'Network error';
		} finally {
			isActionLoading = false;
		}
	}

	function truncate(text: string, max: number) {
		if (text.length <= max) return text;
		return text.slice(0, max) + '…';
	}
</script>

<svelte:head>
	<title>Reviewer Dashboard - Resolution</title>
</svelte:head>

<PlatformBackground>
	<div class="reviewer-container">
		<a href="/app" class="back-link">
			<img src="https://icons.hackclub.com/api/icons/8492a6/back" alt="Back" width="20" height="20" />
			Back to Dashboard
		</a>

		<header>
			<h1>Reviewer Dashboard</h1>
			<p class="subtitle">Review pending project submissions</p>
		</header>

		<div class="filter-bar">
			<label for="pathway-filter" class="filter-label">Filter by pathway</label>
			<select id="pathway-filter" bind:value={pathwayFilter} class="filter-select">
				<option value="">All Pathways</option>
				{#each availablePathways as pw}
					{@const info = pathwayInfo[pw]}
					<option value={pw}>{info?.label ?? pw}</option>
				{/each}
			</select>
		</div>

		{#if errorMessage}
			<div class="error-banner">
				<img src="https://icons.hackclub.com/api/icons/ec3750/important" alt="Error" width="18" height="18" />
				{errorMessage}
			</div>
		{/if}

		{#if isLoading}
			<div class="loading-state">
				<p>Loading submissions…</p>
			</div>
		{:else if submissions.length === 0}
			<div class="empty-state">
				<img src="https://icons.hackclub.com/api/icons/8492a6/checkmark" alt="All clear" width="48" height="48" />
				<p>No pending submissions</p>
				<p class="hint">All caught up! Check back later.</p>
			</div>
		{:else}
			<div class="submissions-grid">
				{#each submissions as submission (submission.id)}
					{@const info = pathwayInfo[submission.pathway]}
					<div class="submission-card">
						<div class="card-header">
							<span class="submitter-name">{submission.firstName} {submission.lastName}</span>
							{#if info}
								<span class="pathway-badge" style="background: #{info.color}">{info.label}</span>
							{:else}
								<span class="pathway-badge">{submission.pathway}</span>
							{/if}
						</div>

						<div class="card-meta">
							<span class="week-label">
								<img src="https://icons.hackclub.com/api/icons/8492a6/event-code" alt="Week" width="16" height="16" />
								Week {submission.week}
							</span>
							<span class="date-label">
								<img src="https://icons.hackclub.com/api/icons/8492a6/clock" alt="Date" width="16" height="16" />
								{new Date(submission.submittedAt).toLocaleDateString()}
							</span>
							{#if submission.hoursSpent != null}
								<span class="hours-label">
									<img src="https://icons.hackclub.com/api/icons/8492a6/clock" alt="Hours" width="16" height="16" />
									{submission.hoursSpent}h reported
								</span>
							{/if}
						</div>

						<p class="description">{truncate(submission.description, 150)}</p>

						{#if submission.screenshotUrl}
							<img src={submission.screenshotUrl} alt="Screenshot" class="screenshot-thumb" />
						{/if}

						<div class="card-links">
							<a href={submission.codeUrl} target="_blank" rel="noopener noreferrer" class="link-btn">
								<img src="https://icons.hackclub.com/api/icons/338eda/code" alt="Code" width="16" height="16" />
								Code
							</a>
							<a href={submission.playableUrl} target="_blank" rel="noopener noreferrer" class="link-btn">
								<img src="https://icons.hackclub.com/api/icons/338eda/external" alt="Demo" width="16" height="16" />
								Demo
							</a>
							{#if submission.hackatimeProject}
								<span class="hackatime-label">
									<img src="https://icons.hackclub.com/api/icons/8492a6/clock" alt="Hackatime" width="16" height="16" />
									{submission.hackatimeProject}
								</span>
							{/if}
						</div>

						<div class="card-actions">
							<button class="approve-btn" onclick={() => openApprove(submission)}>
								<img src="https://icons.hackclub.com/api/icons/ffffff/checkmark" alt="Approve" width="16" height="16" />
								Approve
							</button>
							<button class="reject-btn" onclick={() => openReject(submission)}>
								<img src="https://icons.hackclub.com/api/icons/ffffff/delete" alt="Reject" width="16" height="16" />
								Reject
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	{#if approveModal}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal-overlay" onclick={() => approveModal = null}>
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
			<div class="modal" onclick={(e) => e.stopPropagation()}>
				<h3>Approve Submission</h3>
				<p class="modal-subtitle">Approving {approveModal.firstName} {approveModal.lastName}'s Week {approveModal.week} project</p>

				<form onsubmit={(e) => { e.preventDefault(); handleApprove(); }}>
					<div class="form-group">
						<label for="approve-hours">Hours</label>
						<input type="number" id="approve-hours" bind:value={approveHours} min="0" step="0.1" required />
						<p class="field-hint">Pre-filled with the hours the participant reported. You can deflate this if the project doesn't justify the claimed time.</p>
					</div>

					<div class="form-group">
						<label for="approve-justification">Justification</label>
						<textarea id="approve-justification" bind:value={approveJustification} rows="3" required placeholder="Why are you approving this submission?"></textarea>
					</div>

					<div class="modal-actions">
						<button type="button" class="cancel-btn" onclick={() => approveModal = null}>Cancel</button>
						<button type="submit" class="confirm-approve-btn" disabled={isActionLoading}>
							{isActionLoading ? 'Approving…' : 'Confirm Approval'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if rejectModal}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal-overlay" onclick={() => rejectModal = null}>
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
			<div class="modal" onclick={(e) => e.stopPropagation()}>
				<h3>Reject Submission</h3>
				<p class="modal-subtitle">Rejecting {rejectModal.firstName} {rejectModal.lastName}'s Week {rejectModal.week} project</p>

				<form onsubmit={(e) => { e.preventDefault(); handleReject(); }}>
					<div class="form-group">
						<label for="reject-reason">Reason for rejection</label>
						<textarea id="reject-reason" bind:value={rejectReason} rows="4" required placeholder="Explain why this submission is being rejected…"></textarea>
					</div>

					<div class="modal-actions">
						<button type="button" class="cancel-btn" onclick={() => rejectModal = null}>Cancel</button>
						<button type="submit" class="confirm-reject-btn" disabled={isActionLoading}>
							{isActionLoading ? 'Rejecting…' : 'Confirm Rejection'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</PlatformBackground>

<style>
	.reviewer-container {
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

	.filter-bar {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.filter-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: #1a1a2e;
	}

	.filter-select {
		padding: 0.5rem 1rem;
		border: 1px solid #af98ff;
		border-radius: 8px;
		font-family: 'Kodchasan', sans-serif;
		font-size: 0.875rem;
		color: #1a1a2e;
		background: white;
	}

	.filter-select:focus {
		outline: none;
		border-color: #af98ff;
	}

	.error-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: #fef2f2;
		color: #ec3750;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		border: 1px solid #fecaca;
		font-size: 0.9rem;
		margin-bottom: 1.5rem;
	}

	.loading-state {
		text-align: center;
		padding: 3rem;
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #af98ff;
		border-radius: 16px;
		color: #8492a6;
	}

	.empty-state {
		text-align: center;
		padding: 3rem;
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #af98ff;
		border-radius: 16px;
	}

	.empty-state p {
		margin: 0.75rem 0 0 0;
	}

	.hint {
		color: #8492a6;
		font-size: 0.875rem;
	}

	.submissions-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1.25rem;
	}

	.submission-card {
		background: rgba(255, 255, 255, 0.95);
		border: 1px solid #af98ff;
		border-radius: 16px;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}

	.submitter-name {
		font-weight: 600;
		font-size: 1rem;
	}

	.pathway-badge {
		display: inline-block;
		padding: 0.2rem 0.625rem;
		border-radius: 999px;
		font-size: 0.7rem;
		font-weight: 600;
		color: white;
		background: #8492a6;
		white-space: nowrap;
	}

	.card-meta {
		display: flex;
		gap: 1rem;
		font-size: 0.8rem;
		color: #8492a6;
	}

	.card-meta span {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.description {
		font-size: 0.875rem;
		color: #1a1a2e;
		margin: 0;
		line-height: 1.5;
	}

	.screenshot-thumb {
		width: 100%;
		max-height: 160px;
		object-fit: cover;
		border-radius: 8px;
		border: 1px solid #e0e0e0;
	}

	.card-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.link-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.3rem 0.75rem;
		background: rgba(255, 255, 255, 0.8);
		border: 1px solid #338eda;
		color: #338eda;
		border-radius: 20px;
		text-decoration: none;
		font-size: 0.8rem;
		font-family: 'Kodchasan', sans-serif;
	}

	.link-btn:hover {
		background: rgba(255, 255, 255, 1);
	}

	.hackatime-label {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.8rem;
		color: #8492a6;
	}

	.card-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.approve-btn,
	.reject-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 20px;
		font-size: 0.875rem;
		font-weight: 600;
		font-family: 'Kodchasan', sans-serif;
		cursor: pointer;
		color: white;
	}

	.approve-btn {
		background: #33d6a6;
	}

	.approve-btn:hover {
		background: #2bc299;
	}

	.reject-btn {
		background: #ec3750;
	}

	.reject-btn:hover {
		background: #d42f45;
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
		max-width: 450px;
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

	.form-group {
		margin-bottom: 1.25rem;
	}

	.form-group label {
		display: block;
		font-size: 0.875rem;
		font-weight: 600;
		color: #1a1a2e;
		margin-bottom: 0.375rem;
	}

	.field-hint {
		margin: 0.375rem 0 0 0;
		font-size: 0.75rem;
		color: #8492a6;
	}

	.form-group input[type='number'],
	.form-group textarea {
		width: 100%;
		padding: 0.625rem 0.75rem;
		border: 1px solid #d0d5dd;
		border-radius: 8px;
		font-size: 0.9rem;
		font-family: 'Kodchasan', sans-serif;
		color: #1a1a2e;
		background: white;
		box-sizing: border-box;
	}

	.form-group input:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: #af98ff;
	}

	.form-group textarea {
		resize: vertical;
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.cancel-btn {
		flex: 1;
		padding: 0.75rem;
		background: #f0f0f0;
		border: none;
		border-radius: 20px;
		cursor: pointer;
		font-family: 'Kodchasan', sans-serif;
		font-weight: 500;
		font-size: 0.875rem;
	}

	.cancel-btn:hover {
		background: #e0e0e0;
	}

	.confirm-approve-btn {
		flex: 1;
		padding: 0.75rem;
		background: #33d6a6;
		border: none;
		border-radius: 20px;
		color: white;
		cursor: pointer;
		font-family: 'Kodchasan', sans-serif;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.confirm-approve-btn:hover:not(:disabled) {
		background: #2bc299;
	}

	.confirm-approve-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.confirm-reject-btn {
		flex: 1;
		padding: 0.75rem;
		background: #ec3750;
		border: none;
		border-radius: 20px;
		color: white;
		cursor: pointer;
		font-family: 'Kodchasan', sans-serif;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.confirm-reject-btn:hover:not(:disabled) {
		background: #d42f45;
	}

	.confirm-reject-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (max-width: 768px) {
		.reviewer-container {
			padding: 1rem;
		}

		.submissions-grid {
			grid-template-columns: 1fr;
		}

		.filter-bar {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
