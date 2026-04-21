<script lang="ts">
	import type { PageData } from './$types';
	import PlatformBackground from '$lib/components/PlatformBackground.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';

	import { PATHWAY_INFO } from '$lib/pathways';

	let { data }: { data: PageData } = $props();

	const pathwayInfo = PATHWAY_INFO;

	let copiedId = $state<string | null>(null);
	let selectedPathway = $state('');
	let linkLabel = $state('');
	let linkSlug = $state('');
	let expandedLinks = $state<Set<string>>(new Set());

	function copyLink(code: string, linkId: string) {
		navigator.clipboard.writeText(`${$page.url.origin}/ref/${code}`);
		copiedId = linkId;
		setTimeout(() => {
			copiedId = null;
		}, 2000);
	}

	function toggleExpanded(linkId: string) {
		const next = new Set(expandedLinks);
		if (next.has(linkId)) {
			next.delete(linkId);
		} else {
			next.add(linkId);
		}
		expandedLinks = next;
	}

	function getLinksByPathway(pathway: string) {
		return data.referralLinks.filter((l) => l.pathway === pathway);
	}

	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	const pathwaysWithLinks = $derived(
		data.assignments.filter((p) => getLinksByPathway(p).length > 0)
	);

	const pathwaysWithoutLinks = $derived(
		data.assignments.filter((p) => getLinksByPathway(p).length === 0)
	);
</script>

<svelte:head>
	<title>Referral Links - Resolution</title>
</svelte:head>

<PlatformBackground>
	<div class="referrals-container">
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
			<h1>Referral Links</h1>
			<p class="subtitle">Create and manage referral links for your pathways</p>
		</header>

		<!-- Create Link Form -->
		<section class="card create-section">
			<h2>Create Referral Link</h2>
			<form method="POST" action="?/createLink" use:enhance class="create-form">
				<div class="form-row">
					<div class="form-group">
						<label for="pathway">Pathway</label>
						<select id="pathway" name="pathway" bind:value={selectedPathway} required>
							<option value="" disabled>Select a pathway</option>
							{#each data.assignments as pathway}
								{@const info = pathwayInfo[pathway]}
								<option value={pathway}>{info.label}</option>
							{/each}
						</select>
					</div>
					<div class="form-group">
						<label for="slug">Slug <span class="optional">(optional)</span></label>
						<input
							id="slug"
							name="slug"
							type="text"
							placeholder="e.g. my-link"
							pattern="[a-zA-Z0-9_\-]{'{'}3,32{'}'}"
							bind:value={linkSlug}
						/>
						<span class="field-hint">/ref/{linkSlug || 'auto-generated'}</span>
					</div>
					<div class="form-group">
						<label for="label">Label <span class="optional">(optional)</span></label>
						<input
							id="label"
							name="label"
							type="text"
							placeholder="e.g. Instagram Bio, Discord Server"
							bind:value={linkLabel}
						/>
					</div>
					<button type="submit" class="btn btn-primary create-btn" disabled={!selectedPathway}>
						<img
							src="https://icons.hackclub.com/api/icons/ffffff/add"
							alt=""
							width="16"
							height="16"
						/>
						Create Link
					</button>
				</div>
			</form>
		</section>

		<!-- Links by Pathway -->
		{#if data.referralLinks.length === 0}
			<div class="empty-state">
				<p>You haven't created any referral links yet.</p>
				<p class="hint">Use the form above to create your first link.</p>
			</div>
		{:else}
			{#each pathwaysWithLinks as pathway}
				{@const info = pathwayInfo[pathway]}
				{@const links = getLinksByPathway(pathway)}
				<section class="card pathway-section">
					<div class="pathway-header">
						<img
							src="https://icons.hackclub.com/api/icons/{info.color}/{info.icon}"
							alt={info.label}
							width="28"
							height="28"
						/>
						<h2>{info.label}</h2>
						<span class="link-count">{links.length} link{links.length !== 1 ? 's' : ''}</span>
					</div>

					<div class="links-list">
						{#each links as link}
							<div class="link-item" class:inactive={!link.isActive}>
								<div class="link-top">
									<div class="link-info">
										<div class="link-url-row">
											<code class="link-url"
												>{$page.url.origin}/ref/{link.code}</code
											>
											<button
												class="btn btn-small btn-copy"
												onclick={() => copyLink(link.code, link.id)}
											>
												{#if copiedId === link.id}
													<img
														src="https://icons.hackclub.com/api/icons/33d6a6/checkmark"
														alt=""
														width="14"
														height="14"
													/>
													Copied!
												{:else}
													<img
														src="https://icons.hackclub.com/api/icons/338eda/copy"
														alt=""
														width="14"
														height="14"
													/>
													Copy
												{/if}
											</button>
										</div>
										{#if link.label}
											<span class="link-label">{link.label}</span>
										{/if}
										<div class="link-meta">
											<span class="status-badge" class:active={link.isActive}>
												{link.isActive ? 'Active' : 'Inactive'}
											</span>
											<span class="signup-count">
												<img
													src="https://icons.hackclub.com/api/icons/8492a6/person"
													alt=""
													width="14"
													height="14"
												/>
												{link.signups.length} signup{link.signups.length !== 1
													? 's'
													: ''}
											</span>
											<span class="created-date">
												Created {formatDate(link.createdAt)}
											</span>
										</div>
									</div>
									<div class="link-actions">
										<form method="POST" action="?/toggleLink" use:enhance>
											<input type="hidden" name="linkId" value={link.id} />
											<button
												type="submit"
												class="btn btn-small"
												class:btn-active={link.isActive}
												class:btn-inactive={!link.isActive}
											>
												{link.isActive ? 'Deactivate' : 'Activate'}
											</button>
										</form>
										<form
											method="POST"
											action="?/deleteLink"
											use:enhance
											onsubmit={(e) => {
												if (
													!confirm(
														'Delete this referral link? This cannot be undone.'
													)
												) {
													e.preventDefault();
												}
											}}
										>
											<input type="hidden" name="linkId" value={link.id} />
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

								{#if link.signups.length > 0}
									<button
										class="expand-btn"
										onclick={() => toggleExpanded(link.id)}
									>
										<img
											src="https://icons.hackclub.com/api/icons/8492a6/{expandedLinks.has(link.id) ? 'up-caret' : 'down-caret'}"
											alt=""
											width="14"
											height="14"
										/>
										{expandedLinks.has(link.id) ? 'Hide' : 'Show'} signups
									</button>

									{#if expandedLinks.has(link.id)}
										<div class="signups-list">
											{#each link.signups as signup}
												<div class="signup-row">
													<span class="signup-name">
														{signup.firstName || ''}
														{signup.lastName || ''}
													</span>
													<span class="signup-email">{signup.email}</span>
													<span class="signup-date"
														>{formatDate(signup.createdAt)}</span
													>
												</div>
											{/each}
										</div>
									{/if}
								{/if}
							</div>
						{/each}
					</div>
				</section>
			{/each}
		{/if}
	</div>
</PlatformBackground>

<style>
	.referrals-container {
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

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		flex: 1;
		position: relative;
		padding-bottom: 1.25rem;
	}

	.form-group label {
		font-size: 0.85rem;
		font-weight: 600;
		color: #1a1a2e;
	}

	.optional {
		font-weight: 400;
		color: #8492a6;
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

	.field-hint {
		position: absolute;
		bottom: 0;
		left: 0;
		font-size: 0.75rem;
		color: #8492a6;
		font-family: monospace;
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
		margin-bottom: 1.25rem;
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

	.btn-copy {
		background: #f0f4f8;
		color: #338eda;
		border: 1px solid #d0d0d0;
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

	/* Pathway Sections */
	.pathway-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}

	.link-count {
		color: #8492a6;
		font-size: 0.85rem;
		margin-left: auto;
	}

	.links-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.link-item {
		background: white;
		border: 2px solid #e0e0e0;
		border-radius: 12px;
		padding: 1rem;
		transition: border-color 0.15s;
	}

	.link-item:hover {
		border-color: #af98ff;
	}

	.link-item.inactive {
		opacity: 0.65;
	}

	.link-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
	}

	.link-info {
		flex: 1;
		min-width: 0;
	}

	.link-url-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.375rem;
	}

	.link-url {
		font-size: 0.85rem;
		background: #f0f4f8;
		padding: 0.25rem 0.5rem;
		border-radius: 6px;
		color: #338eda;
		word-break: break-all;
	}

	.link-label {
		display: inline-block;
		font-size: 0.8rem;
		color: #8492a6;
		margin-bottom: 0.375rem;
	}

	.link-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		font-size: 0.8rem;
		color: #8492a6;
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

	.signup-count {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.link-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	/* Expand / Signups */
	.expand-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		background: none;
		border: none;
		color: #8492a6;
		cursor: pointer;
		font-size: 0.8rem;
		font-family: 'Kodchasan', sans-serif;
		padding: 0.5rem 0 0 0;
	}

	.expand-btn:hover {
		color: #1a1a2e;
	}

	.signups-list {
		margin-top: 0.75rem;
		border-top: 1px solid #e0e0e0;
		padding-top: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.signup-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		font-size: 0.8rem;
		padding: 0.375rem 0.5rem;
		border-radius: 8px;
		background: #f9f9fb;
	}

	.signup-name {
		font-weight: 600;
		color: #1a1a2e;
		min-width: 120px;
	}

	.signup-email {
		color: #8492a6;
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.signup-date {
		color: #8492a6;
		white-space: nowrap;
	}

	@media (max-width: 768px) {
		.create-form .form-row {
			flex-direction: column;
			align-items: stretch;
		}

		.link-top {
			flex-direction: column;
		}

		.link-actions {
			align-self: flex-start;
		}

		.link-url-row {
			flex-wrap: wrap;
		}

		.signup-row {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
		}

		.signup-name {
			min-width: unset;
		}
	}
</style>
