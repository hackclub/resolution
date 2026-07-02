<script lang="ts">
	import type { PageData } from './$types';
	import PlatformBackground from '$lib/components/PlatformBackground.svelte';
	import Icon from '$lib/components/Icon.svelte';

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
		slackId: string | null;
		status: 'pending' | 'approved' | 'rejected';
		address?: {
			line1: string | null;
			line2: string | null;
			city: string | null;
			stateProvince: string | null;
			country: string | null;
			zipPostalCode: string | null;
		};
	}

	const pathwayInfo = PATHWAY_INFO;

	const allPathways = PATHWAY_IDS;
	const availablePathways = $derived(data.isAdmin ? allPathways : data.assignments);

	let submissions = $state<Submission[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state('');
	let pathwayFilter = $state('');
	let weekFilter = $state('');
	let statusFilter = $state('pending');
	let sortBy = $state('');
	let expandedAddress = $state<string | null>(null);

	const STATUS_LABELS: Record<string, string> = {
		pending: 'Pending',
		approved: 'Approved',
		rejected: 'Rejected'
	};

	const availableWeeks = $derived(
		Array.from(
			new Set([
				...Array.from({ length: data.totalWeeks }, (_, index) => index + 1),
				...submissions.map(s => s.week).filter(w => w != null)
			])
		).sort((a, b) => a - b)
	);

	const visibleSubmissions = $derived.by(() => {
		const filtered = weekFilter
			? submissions.filter(s => String(s.week) === weekFilter)
			: submissions;
		if (sortBy === 'hours-desc') {
			return [...filtered].sort((a, b) => (b.hoursSpent ?? 0) - (a.hoursSpent ?? 0));
		}
		return filtered;
	});

	let approveModal = $state<Submission | null>(null);
	let rejectModal = $state<Submission | null>(null);
	let approveHours = $state(0.5);
	let approveJustification = $state('');
	let rejectReason = $state('');
	let isActionLoading = $state(false);

	$effect(() => {
		fetchSubmissions(pathwayFilter, statusFilter);
	});

	async function fetchSubmissions(pathway: string, status: string) {
		isLoading = true;
		errorMessage = '';
		try {
			const params = new URLSearchParams();
			if (pathway) params.set('pathway', pathway);
			if (status) params.set('status', status);
			const query = params.toString();
			const url = query ? `/api/review/submissions?${query}` : '/api/review/submissions';
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

	function isValidSlackId(id: string | null): id is string {
		return typeof id === 'string' && /^[A-Z0-9]+$/.test(id);
	}

	function hasAddress(address: Submission['address']): address is NonNullable<Submission['address']> {
		return !!address && Object.values(address).some(v => typeof v === 'string' && v.trim().length > 0);
	}

	function formatAddress(address: NonNullable<Submission['address']>): string {
		const parts = [
			address.line1,
			address.line2,
			[address.city, address.stateProvince].filter(Boolean).join(', '),
			address.zipPostalCode,
			address.country
		];
		return parts.filter(p => typeof p === 'string' && p.trim().length > 0).join('\n');
	}
</script>

<svelte:head>
	<title>Reviewer Dashboard - Resolution</title>
</svelte:head>

<PlatformBackground>
	<div class="reviewer-container">
		<a href="/app" class="back-link">
			<Icon icon="back" alt="Back" size={20} />
			Back to Dashboard
		</a>

		<header>
			<h1>Reviewer Dashboard</h1>
			<p class="subtitle">Review pending project submissions</p>
		</header>

		<div class="filter-bar">
			<div class="filter-group">
				<label for="pathway-filter" class="filter-label">Filter by pathway</label>
				<select id="pathway-filter" bind:value={pathwayFilter} class="filter-select">
					<option value="">All Pathways</option>
					{#each availablePathways as pw}
						{@const info = pathwayInfo[pw]}
						<option value={pw}>{info?.label ?? pw}</option>
					{/each}
				</select>
			</div>
			<div class="filter-group">
				<label for="week-filter" class="filter-label">Filter by week</label>
				<select id="week-filter" bind:value={weekFilter} class="filter-select">
					<option value="">All Weeks</option>
					{#each availableWeeks as wk}
						<option value={String(wk)}>Week {wk}</option>
					{/each}
				</select>
			</div>
			<div class="filter-group">
				<label for="status-filter" class="filter-label">Filter by status</label>
				<select id="status-filter" bind:value={statusFilter} class="filter-select">
					<option value="pending">Pending</option>
					<option value="approved">Approved</option>
					<option value="rejected">Rejected</option>
					<option value="all">All</option>
				</select>
			</div>
			<div class="filter-group">
				<label for="sort-by" class="filter-label">Sort by</label>
				<select id="sort-by" bind:value={sortBy} class="filter-select">
					<option value="">Default</option>
					<option value="hours-desc">Hours (high to low)</option>
				</select>
			</div>
		</div>

		{#if errorMessage}
			<div class="error-banner">
				<Icon icon="important" color="ec3750" alt="Error" size={18} />
				{errorMessage}
			</div>
		{/if}

		{#if isLoading}
			<div class="loading-state">
				<p>Loading submissions…</p>
			</div>
		{:else if visibleSubmissions.length === 0}
			<div class="empty-state">
				<Icon icon="checkmark" alt="All clear" size={48} />
				<p>No pending submissions</p>
				<p class="hint">All caught up! Check back later.</p>
			</div>
		{:else}
			<div class="submissions-grid">
				{#each visibleSubmissions as submission (submission.id)}
					{@const info = pathwayInfo[submission.pathway]}
					<div class="submission-card">
						<div class="card-header">
							<span class="submitter-name">{submission.firstName} {submission.lastName}</span>
							<div class="card-badges">
								<span class="status-badge status-{submission.status}">{STATUS_LABELS[submission.status]}</span>
								{#if info}
									<span class="pathway-badge" style="background: #{info.color}">{info.label}</span>
								{:else}
									<span class="pathway-badge">{submission.pathway}</span>
								{/if}
							</div>
						</div>

						<div class="card-meta">
							<span class="email-label">
								<Icon icon="email" alt="Email" size={16} />
								{submission.email}
							</span>
							<span class="week-label">
								<Icon icon="event-code" alt="Week" size={16} />
								Week {submission.week}
							</span>
							<span class="date-label">
								<Icon icon="clock" alt="Date" size={16} />
								{new Date(submission.submittedAt).toLocaleDateString()}
							</span>
							{#if submission.hoursSpent != null}
								<span class="hours-label">
									<Icon icon="clock" alt="Hours" size={16} />
									{submission.hoursSpent}h reported
								</span>
							{/if}
							{#if isValidSlackId(submission.slackId)}
								<span class="slack-label">
									<Icon icon="slack-fill" alt="Slack ID" size={16} />
									<a
										href="https://hackclub.enterprise.slack.com/team/{submission.slackId}"
										target="_blank"
										rel="noopener noreferrer"
									>{submission.slackId}</a>
								</span>
							{/if}
						</div>

						<p class="description">{truncate(submission.description, 150)}</p>

						{#if submission.screenshotUrl}
							<img src={submission.screenshotUrl} alt="Screenshot" class="screenshot-thumb" />
						{/if}

						<div class="card-links">
							<a href={submission.codeUrl} target="_blank" rel="noopener noreferrer" class="link-btn">
								<Icon icon="code" color="338eda" alt="Code" size={16} />
								Code
							</a>
							<a href={submission.playableUrl} target="_blank" rel="noopener noreferrer" class="link-btn">
								<Icon icon="external" color="338eda" alt="Demo" size={16} />
								Demo
							</a>
							{#if submission.hackatimeProject}
								<span class="hackatime-label">
									<Icon icon="clock" alt="Hackatime" size={16} />
									{submission.hackatimeProject}
								</span>
							{/if}
							{#if data.isAmbassador && hasAddress(submission.address)}
								<button
									type="button"
									class="link-btn address-btn"
									onclick={() => expandedAddress = expandedAddress === submission.id ? null : submission.id}
								>
									<Icon icon="home" color="338eda" alt="Address" size={16} />
									{expandedAddress === submission.id ? 'Hide address' : 'View address'}
								</button>
							{/if}
						</div>

						{#if data.isAmbassador && expandedAddress === submission.id && hasAddress(submission.address)}
							<pre class="address-block">{formatAddress(submission.address)}</pre>
						{/if}

						{#if submission.status === 'pending'}
							<div class="card-actions">
								<button class="approve-btn" onclick={() => openApprove(submission)}>
									<Icon icon="checkmark" color="ffffff" alt="Approve" size={16} />
									Approve
								</button>
								<button class="reject-btn" onclick={() => openReject(submission)}>
									<Icon icon="delete" color="ffffff" alt="Reject" size={16} />
									Reject
								</button>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	{#if approveModal}
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal-overlay" role="button" tabindex="-1" onclick={() => approveModal = null}>
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
			<div class="modal" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()}>
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
		<div class="modal-overlay" role="button" tabindex="-1" onclick={() => rejectModal = null}>
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
			<div class="modal" role="dialog" tabindex="-1" onclick={(e) => e.stopPropagation()}>
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
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.filter-group {
		display: flex;
		align-items: center;
		gap: 0.75rem;
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

	.card-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		justify-content: flex-end;
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

	.status-badge {
		display: inline-block;
		padding: 0.2rem 0.625rem;
		border-radius: 999px;
		font-size: 0.7rem;
		font-weight: 600;
		white-space: nowrap;
		border: 1px solid transparent;
	}

	.status-pending {
		background: #fff4e0;
		color: #b56a00;
		border-color: #ffd591;
	}

	.status-approved {
		background: #e3f9f0;
		color: #1a9b6c;
		border-color: #9be3c8;
	}

	.status-rejected {
		background: #fef2f2;
		color: #ec3750;
		border-color: #fecaca;
	}

	.card-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
		font-size: 0.8rem;
		color: #8492a6;
	}

	.card-meta span {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		min-width: 0;
	}

	.email-label {
		overflow-wrap: anywhere;
		word-break: break-word;
	}

	.slack-label a {
		color: inherit;
		text-decoration: underline;
	}

	.slack-label a:hover {
		color: #338eda;
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

	.address-btn {
		cursor: pointer;
		font-weight: 600;
	}

	.address-block {
		margin: 0;
		padding: 0.75rem 1rem;
		background: rgba(175, 152, 255, 0.08);
		border: 1px solid #af98ff;
		border-radius: 8px;
		font-family: 'Kodchasan', sans-serif;
		font-size: 0.8rem;
		line-height: 1.5;
		color: #1a1a2e;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
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
