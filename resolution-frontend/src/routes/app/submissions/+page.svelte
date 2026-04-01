<script lang="ts">
	import PlatformBackground from '$lib/components/PlatformBackground.svelte';
	import { PATHWAY_INFO } from '$lib/pathways';

	interface Submission {
		id: string;
		firstName: string;
		lastName: string;
		pathway: string;
		week: number;
		description: string;
		codeUrl: string;
		playableUrl: string;
		screenshotUrl: string | null;
		rejected: boolean;
		rejectReason: string | null;
		automationStatus: string | null;
		status: 'rejected' | 'accepted' | 'pending';
		submittedAt: string;
	}

	const pathwayInfo = PATHWAY_INFO;

	let submissions = $state<Submission[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state('');
	let statusFilter = $state('');

	const filteredSubmissions = $derived(
		statusFilter ? submissions.filter((s) => s.status === statusFilter) : submissions
	);

	const counts = $derived({
		all: submissions.length,
		pending: submissions.filter((s) => s.status === 'pending').length,
		accepted: submissions.filter((s) => s.status === 'accepted').length,
		rejected: submissions.filter((s) => s.status === 'rejected').length
	});

	$effect(() => {
		fetchSubmissions();
	});

	async function fetchSubmissions() {
		isLoading = true;
		errorMessage = '';
		try {
			const res = await fetch('/api/submissions/mine');
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

	function statusLabel(status: string) {
		if (status === 'rejected') return 'Rejected';
		if (status === 'accepted') return 'Accepted';
		return 'Pending';
	}

	function statusMessage(submission: Submission) {
		if (submission.status === 'rejected') {
			return 'Check your email for further instructions.';
		}
		if (submission.status === 'accepted') {
			return 'Your project has been approved!';
		}
		return 'Your submission is being reviewed.';
	}
</script>

<svelte:head>
	<title>My Submissions - Resolution</title>
</svelte:head>

<PlatformBackground>
	<div class="submissions-container">
		<a href="/app" class="back-link">
			<img src="https://icons.hackclub.com/api/icons/8492a6/back" alt="Back" width="20" height="20" />
			Back to Dashboard
		</a>

		<header>
			<h1>My Submissions</h1>
			<p class="subtitle">Track the status of your project submissions</p>
		</header>

		<div class="status-summary">
			<button
				class="summary-pill"
				class:active={statusFilter === ''}
				onclick={() => (statusFilter = '')}
			>
				All ({counts.all})
			</button>
			<button
				class="summary-pill pending-pill"
				class:active={statusFilter === 'pending'}
				onclick={() => (statusFilter = statusFilter === 'pending' ? '' : 'pending')}
			>
				Pending ({counts.pending})
			</button>
			<button
				class="summary-pill accepted-pill"
				class:active={statusFilter === 'accepted'}
				onclick={() => (statusFilter = statusFilter === 'accepted' ? '' : 'accepted')}
			>
				Accepted ({counts.accepted})
			</button>
			<button
				class="summary-pill rejected-pill"
				class:active={statusFilter === 'rejected'}
				onclick={() => (statusFilter = statusFilter === 'rejected' ? '' : 'rejected')}
			>
				Rejected ({counts.rejected})
			</button>
		</div>

		{#if errorMessage}
			<div class="error-banner">
				<img src="https://icons.hackclub.com/api/icons/ec3750/important" alt="Error" width="18" height="18" />
				{errorMessage}
			</div>
		{/if}

		{#if isLoading}
			<div class="loading-state">
				<p>Loading your submissions…</p>
			</div>
		{:else if filteredSubmissions.length === 0}
			<div class="empty-state">
				<img src="https://icons.hackclub.com/api/icons/8492a6/code" alt="No submissions" width="48" height="48" />
				{#if submissions.length === 0}
					<p>No submissions yet</p>
					<p class="hint">Submit a project from your pathway page to see it here.</p>
				{:else}
					<p>No {statusFilter} submissions</p>
				{/if}
			</div>
		{:else}
			<div class="submissions-grid">
				{#each filteredSubmissions as submission (submission.id)}
					{@const info = pathwayInfo[submission.pathway]}
					<div class="submission-card">
						<div class="card-header">
							<div class="card-title-row">
								{#if info}
									<span class="pathway-badge" style="background: #{info.color}">{info.label}</span>
								{:else}
									<span class="pathway-badge">{submission.pathway}</span>
								{/if}
								<span class="week-label">Week {submission.week}</span>
							</div>
							<span class="status-badge status-{submission.status}">
								{statusLabel(submission.status)}
							</span>
						</div>

						<p class="description">{submission.description}</p>

						<p class="status-message status-message-{submission.status}">
							{statusMessage(submission)}
						</p>

						{#if submission.status === 'rejected' && submission.rejectReason}
							<div class="reject-reason">
								<strong>Reason:</strong> {submission.rejectReason}
							</div>
						{/if}

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
						</div>

						<div class="card-footer">
							<span class="date-label">
								<img src="https://icons.hackclub.com/api/icons/8492a6/clock" alt="Date" width="14" height="14" />
								{new Date(submission.submittedAt).toLocaleDateString()}
							</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</PlatformBackground>

<style>
	.submissions-container {
		min-height: 100vh;
		padding: 2rem;
		color: #1a1a2e;
		max-width: 1000px;
		margin: 0 auto;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: #8492a6;
		text-decoration: none;
		font-size: 0.9rem;
		margin-bottom: 1.5rem;
		font-family: 'Kodchasan', sans-serif;
	}

	.back-link:hover {
		color: #1a1a2e;
	}

	header {
		margin-bottom: 1.5rem;
	}

	h1 {
		font-size: 1.5rem;
		margin: 0 0 0.25rem 0;
	}

	.subtitle {
		color: #8492a6;
		margin: 0;
		font-size: 0.9rem;
	}

	.status-summary {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
	}

	.summary-pill {
		padding: 0.4rem 1rem;
		border-radius: 20px;
		border: 1px solid #d0d5dd;
		background: rgba(255, 255, 255, 0.8);
		color: #8492a6;
		cursor: pointer;
		font-family: 'Kodchasan', sans-serif;
		font-size: 0.85rem;
		font-weight: 500;
	}

	.summary-pill:hover {
		background: rgba(255, 255, 255, 1);
	}

	.summary-pill.active {
		background: rgba(255, 255, 255, 1);
		border-color: #af98ff;
		color: #1a1a2e;
		font-weight: 600;
	}

	.pending-pill.active {
		border-color: #ff8c37;
		color: #ff8c37;
	}

	.accepted-pill.active {
		border-color: #33d6a6;
		color: #33d6a6;
	}

	.rejected-pill.active {
		border-color: #ec3750;
		color: #ec3750;
	}

	.error-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: rgba(236, 55, 80, 0.1);
		border: 1px solid #ec3750;
		border-radius: 8px;
		color: #ec3750;
		margin-bottom: 1rem;
		font-size: 0.875rem;
	}

	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		color: #8492a6;
		text-align: center;
	}

	.empty-state p {
		margin: 0.5rem 0 0 0;
		font-size: 1rem;
	}

	.hint {
		font-size: 0.85rem;
		color: #b0b8c4;
	}

	.submissions-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.25rem;
	}

	.submission-card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1.25rem;
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #e0e0e0;
		border-radius: 12px;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.card-title-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.pathway-badge {
		padding: 0.2rem 0.6rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
		background: #8492a6;
	}

	.week-label {
		font-size: 0.8rem;
		color: #8492a6;
	}

	.status-badge {
		padding: 0.2rem 0.7rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.status-pending {
		background: rgba(255, 140, 55, 0.15);
		color: #ff8c37;
	}

	.status-accepted {
		background: rgba(51, 214, 166, 0.15);
		color: #2aa87e;
	}

	.status-rejected {
		background: rgba(236, 55, 80, 0.15);
		color: #ec3750;
	}

	.description {
		font-size: 0.875rem;
		color: #1a1a2e;
		margin: 0;
		line-height: 1.5;
	}

	.status-message {
		font-size: 0.8rem;
		margin: 0;
		padding: 0.5rem 0.75rem;
		border-radius: 8px;
	}

	.status-message-pending {
		background: rgba(255, 140, 55, 0.08);
		color: #cc6e2a;
	}

	.status-message-accepted {
		background: rgba(51, 214, 166, 0.08);
		color: #2aa87e;
	}

	.status-message-rejected {
		background: rgba(236, 55, 80, 0.08);
		color: #ec3750;
	}

	.reject-reason {
		font-size: 0.8rem;
		color: #ec3750;
		padding: 0.5rem 0.75rem;
		background: rgba(236, 55, 80, 0.05);
		border-left: 3px solid #ec3750;
		border-radius: 0 8px 8px 0;
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

	.card-footer {
		display: flex;
		align-items: center;
	}

	.date-label {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.75rem;
		color: #8492a6;
	}

	@media (max-width: 768px) {
		.submissions-container {
			padding: 1rem;
		}

		.submissions-grid {
			grid-template-columns: 1fr;
		}

		.status-summary {
			gap: 0.375rem;
		}

		.summary-pill {
			font-size: 0.8rem;
			padding: 0.35rem 0.75rem;
		}
	}
</style>
