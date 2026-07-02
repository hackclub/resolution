<script lang="ts">
	import type { PageData } from './$types';
	import PlatformBackground from '$lib/components/PlatformBackground.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { PATHWAYS, PATHWAY_INFO } from '$lib/pathways';

	let { data }: { data: PageData } = $props();

	type StatusFilter = 'all' | 'pending' | 'submitted' | 'rejected' | 'fixed';

	let statusFilter = $state<StatusFilter>('all');
	let pathwayFilter = $state<string>('all');

	const STATUS_OPTIONS: ReadonlyArray<[StatusFilter, string]> = [
		['all', 'All'],
		['pending', 'Pending'],
		['submitted', 'Submitted'],
		['rejected', 'Rejected'],
		['fixed', 'Fixed']
	];

	function statusOf(s: typeof data.submissions[number]): Exclude<StatusFilter, 'all'> {
		if (s.isRejected && s.fixed) return 'fixed';
		if (s.isRejected) return 'rejected';
		if (s.isSubmittedYSWS) return 'submitted';
		return 'pending';
	}

	const filtered = $derived(
		data.submissions.filter((s) => {
			if (statusFilter !== 'all' && statusOf(s) !== statusFilter) return false;
			if (pathwayFilter !== 'all' && s.pathway !== pathwayFilter) return false;
			return true;
		})
	);

	const pathwaysPresent = $derived(
		Array.from(new Set(data.submissions.map((s) => s.pathway)))
	);

	const statusCounts = $derived({
		all: data.submissions.length,
		pending: data.submissions.filter((s) => statusOf(s) === 'pending').length,
		submitted: data.submissions.filter((s) => statusOf(s) === 'submitted').length,
		rejected: data.submissions.filter((s) => statusOf(s) === 'rejected').length,
		fixed: data.submissions.filter((s) => statusOf(s) === 'fixed').length
	});

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<PlatformBackground>
	<div class="page">
		<header class="page-header">
			<a href="/app" class="back-link">← Back to App</a>
			<h1>Your Submissions</h1>
			<p class="subtitle">
				{data.submissions.length}
				{data.submissions.length === 1 ? 'submission' : 'submissions'} across your pathways
			</p>
		</header>

		{#if data.submissions.length > 0}
			<section class="filters" aria-label="Filter submissions">
				<div class="filter-group">
					<span class="filter-label">Status</span>
					<div class="pills">
						{#each STATUS_OPTIONS as [value, label]}
							<button
								type="button"
								class="pill"
								class:active={statusFilter === value}
								onclick={() => (statusFilter = value)}
							>
								{label}
								<span class="count">{statusCounts[value]}</span>
							</button>
						{/each}
					</div>
				</div>

				{#if pathwaysPresent.length > 1}
					<div class="filter-group">
						<span class="filter-label">Pathway</span>
						<div class="pills">
							<button
								type="button"
								class="pill"
								class:active={pathwayFilter === 'all'}
								onclick={() => (pathwayFilter = 'all')}
							>
								All
							</button>
							{#each PATHWAYS as p}
								{#if pathwaysPresent.includes(p.id)}
									<button
										type="button"
										class="pill pill-pathway"
										class:active={pathwayFilter === p.id}
										style="--pathway-color: #{p.color}"
										onclick={() => (pathwayFilter = p.id)}
									>
										<Icon
											icon={p.icon}
											color={pathwayFilter === p.id ? 'fff' : p.color}
											size={14}
										/>
										{p.label}
									</button>
								{/if}
							{/each}
						</div>
					</div>
				{/if}
			</section>
		{/if}

		{#if data.submissions.length === 0}
			<p class="empty">You haven't submitted any projects yet.</p>
		{:else if filtered.length === 0}
			<p class="empty">No submissions match the current filters.</p>
		{:else}
			<ul class="submissions">
				{#each filtered as submission (submission.id)}
					{@const info = PATHWAY_INFO[submission.pathway]}
					{@const color = info?.color ?? '8492a6'}
					{@const status = statusOf(submission)}
					<li class="submission">
						<header class="submission-header">
							<span class="pathway-pill" style="--pathway-color: #{color}">
								{#if info}
									<Icon icon={info.icon} color="fff" size={14} />
								{/if}
								{info?.label ?? submission.pathway}
							</span>
							<span class="week-label">Week {submission.week}</span>
							<span class="badge badge-{status}">
								{status === 'pending'
									? 'Pending review'
									: status === 'submitted'
										? 'Submitted to YSWS'
										: status === 'rejected'
											? 'Rejected'
											: 'Fixed'}
							</span>
						</header>

						<div class="submission-body">
							{#if submission.screenshotUrl}
							<a
								href={submission.screenshotUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="screenshot-link"
							>
									<img
										src={submission.screenshotUrl}
										alt="Project screenshot"
										class="screenshot"
									/>
								</a>
							{/if}

							<div class="submission-content">
								<p class="description">{submission.description}</p>

								{#if status === 'rejected' && submission.rejectionReason}
									<div class="rejection">
										<strong>Rejection reason</strong>
										<p>{submission.rejectionReason}</p>
									</div>
								{/if}

								<div class="links">
									{#if submission.codeUrl}
										<a href={submission.codeUrl} target="_blank" rel="noopener noreferrer">Code</a>
									{/if}
									{#if submission.playableUrl}
										<a href={submission.playableUrl} target="_blank" rel="noopener noreferrer">Playable</a>
									{/if}
								</div>
							</div>
						</div>

						<footer class="meta">
							{#if submission.githubUsername}
								<span>
									GitHub:
									<a
										href="https://github.com/{submission.githubUsername}"
										target="_blank"
										rel="noopener noreferrer">@{submission.githubUsername}</a>
								</span>
							{/if}
							{#if submission.hackatimeProject}
								<span>Hackatime: {submission.hackatimeProject}</span>
							{/if}
							{#if submission.hoursSpent != null}
								<span>{submission.hoursSpent}h spent</span>
							{/if}
							<span>Submitted {formatDate(submission.submittedAt)}</span>
						</footer>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</PlatformBackground>

<style>
	.page {
		max-width: 900px;
		margin: 0 auto;
		padding: 2rem 1.5rem 4rem;
		font-family: 'Kodchasan', sans-serif;
	}

	.page-header {
		margin-bottom: 1.5rem;
	}

	.back-link {
		display: inline-block;
		color: #8492a6;
		text-decoration: none;
		font-size: 0.875rem;
		margin-bottom: 0.75rem;
	}

	.back-link:hover {
		color: #1a1a2e;
		text-decoration: underline;
	}

	h1 {
		font-size: 1.85rem;
		color: #1a1a2e;
		margin: 0 0 0.25rem 0;
	}

	.subtitle {
		color: #8492a6;
		margin: 0;
		font-size: 0.95rem;
	}

	.empty {
		color: #8492a6;
		text-align: center;
		padding: 3rem 1rem;
		background: rgba(255, 255, 255, 0.85);
		border-radius: 16px;
	}

	/* Filters */
	.filters {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		padding: 1rem 1.25rem;
		background: rgba(255, 255, 255, 0.9);
		border-radius: 16px;
		margin-bottom: 1.5rem;
	}

	.filter-group {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 0.75rem;
	}

	.filter-label {
		font-size: 0.75rem;
		font-weight: 700;
		color: #8492a6;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		min-width: 4rem;
	}

	.pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.pill {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.75rem;
		border: 1px solid #e0e4eb;
		border-radius: 999px;
		background: white;
		color: #1a1a2e;
		font-family: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.15s, border-color 0.15s, color 0.15s;
	}

	.pill:hover {
		border-color: #b5bfcc;
	}

	.pill .count {
		display: inline-block;
		min-width: 1.25rem;
		padding: 0 0.3rem;
		background: #eef0f3;
		color: #6c7a8c;
		border-radius: 999px;
		font-size: 0.7rem;
		text-align: center;
	}

	.pill.active {
		background: #1a1a2e;
		color: white;
		border-color: #1a1a2e;
	}

	.pill.active .count {
		background: rgba(255, 255, 255, 0.2);
		color: white;
	}

	.pill-pathway.active {
		background: var(--pathway-color);
		border-color: var(--pathway-color);
		color: white;
	}

	/* Submissions list */
	.submissions {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.submission {
		background: rgba(255, 255, 255, 0.95);
		border: 1px solid #e0e4eb;
		border-radius: 16px;
		padding: 1.25rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.submission-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
	}

	.pathway-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.75rem;
		background: var(--pathway-color);
		color: white;
		border-radius: 999px;
		font-size: 0.78rem;
		font-weight: 700;
	}

	.week-label {
		font-size: 0.85rem;
		color: #8492a6;
		font-weight: 600;
	}

	.badge {
		margin-left: auto;
		display: inline-block;
		padding: 0.25rem 0.65rem;
		border-radius: 999px;
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.badge-pending {
		background: #fff3cd;
		color: #856404;
	}

	.badge-submitted {
		background: #d4edda;
		color: #155724;
	}

	.badge-rejected {
		background: #f8d7da;
		color: #721c24;
	}

	.badge-fixed {
		background: #d1ecf1;
		color: #0c5460;
	}

	/* Body */
	.submission-body {
		display: grid;
		grid-template-columns: minmax(0, 280px) 1fr;
		gap: 1.25rem;
		align-items: start;
	}

	.screenshot-link {
		display: block;
		line-height: 0;
	}

	.screenshot {
		display: block;
		width: 100%;
		max-height: 220px;
		object-fit: cover;
		border-radius: 10px;
		border: 1px solid #e0e4eb;
	}

	.submission-content {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	.description {
		color: #2c3e50;
		line-height: 1.55;
		margin: 0;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.rejection {
		background: #fff5f5;
		border-left: 3px solid #ec3750;
		padding: 0.65rem 0.9rem;
		border-radius: 6px;
	}

	.rejection strong {
		display: block;
		color: #ec3750;
		margin-bottom: 0.25rem;
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.rejection p {
		margin: 0;
		color: #2c3e50;
		font-size: 0.9rem;
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.links a {
		padding: 0.4rem 0.9rem;
		background: #338eda;
		color: white;
		text-decoration: none;
		border-radius: 8px;
		font-size: 0.82rem;
		font-weight: 600;
	}

	.links a:hover {
		background: #2a76b8;
	}

	/* Meta */
	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 1rem;
		font-size: 0.8rem;
		color: #8492a6;
		padding-top: 0.85rem;
		border-top: 1px solid #eef0f3;
	}

	.meta a {
		color: #338eda;
		text-decoration: none;
	}

	.meta a:hover {
		text-decoration: underline;
	}

	/* Stack image above content on narrow screens */
	@media (max-width: 640px) {
		.submission-body {
			grid-template-columns: 1fr;
		}

		.badge {
			margin-left: 0;
		}
	}
</style>
