<script lang="ts">
	import type { PageData } from './$types';
	import PlatformBackground from '$lib/components/PlatformBackground.svelte';

	let { data }: { data: PageData } = $props();

	const pathwayInfo: Record<string, { label: string; color: string }> = {
		PYTHON: { label: 'Python', color: 'ec3750' },
		RUST: { label: 'Rust', color: '338eda' },
		GAME_DEV: { label: 'Game Dev', color: '33d6a6' },
		HARDWARE: { label: 'Hardware', color: 'ff8c37' },
		DESIGN: { label: 'Design', color: 'a633d6' },
		GENERAL_CODING: { label: 'General Coding', color: '5bc0de' }
	};

	const pathway = $derived(pathwayInfo[data.pathwayId]);

	let isSubmitting = $state(false);
	let submitError = $state('');
	let submitSuccess = $state(false);

	let codeUrl = $state('');
	let playableUrl = $state('');
	let howDidYouHear = $state('');
	let doingWell = $state('');
	let improvements = $state('');
	let firstName = $state(data.user.firstName || '');
	let lastName = $state(data.user.lastName || '');
	let email = $state(data.user.email || '');
	let description = $state('');
	let githubUsername = $state('');
	let addressLine1 = $state('');
	let addressLine2 = $state('');
	let city = $state('');
	let stateProvince = $state('');
	let country = $state('');
	let zipPostalCode = $state('');
	let birthday = $state('');
	let hackatimeProject = $state('');
	let hoursSpent = $state('');
	let screenshotFile = $state<File | null>(null);
	let screenshotPreview = $state('');

	function handleScreenshot(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (file.size > 5 * 1024 * 1024) {
			submitError = 'Screenshot must be under 5MB';
			input.value = '';
			return;
		}

		if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) {
			submitError = 'Screenshot must be a PNG, JPEG, GIF, or WebP image';
			input.value = '';
			return;
		}

		screenshotFile = file;
		submitError = '';

		const reader = new FileReader();
		reader.onload = () => {
			screenshotPreview = reader.result as string;
		};
		reader.readAsDataURL(file);
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		submitError = '';
		isSubmitting = true;

		try {
			const formData = new FormData();
			formData.append('codeUrl', codeUrl);
			formData.append('playableUrl', playableUrl);
			formData.append('howDidYouHear', howDidYouHear);
			formData.append('doingWell', doingWell);
			formData.append('improvements', improvements);
			formData.append('firstName', firstName);
			formData.append('lastName', lastName);
			formData.append('email', email);
			formData.append('description', description);
			formData.append('githubUsername', githubUsername);
			formData.append('addressLine1', addressLine1);
			formData.append('addressLine2', addressLine2);
			formData.append('city', city);
			formData.append('stateProvince', stateProvince);
			formData.append('country', country);
			formData.append('zipPostalCode', zipPostalCode);
			formData.append('birthday', birthday);
			formData.append('hackatimeProject', hackatimeProject);
			formData.append('hoursSpent', hoursSpent);
			formData.append('pathway', data.pathwayId);
			formData.append('week', String(data.weekNumber));

			if (screenshotFile) {
				formData.append('screenshot', screenshotFile);
			}

			const res = await fetch('/api/ships/submit-project', {
				method: 'POST',
				body: formData
			});

			const result = await res.json();

			if (!res.ok) {
				submitError = result.error || 'Something went wrong. Please try again.';
				return;
			}

			submitSuccess = true;
		} catch {
			submitError = 'Network error. Please check your connection and try again.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Ship Project - Week {data.weekNumber} - {pathway.label} - Resolution</title>
</svelte:head>

<PlatformBackground>
	<div class="ship-container">
		<a href="/app/pathway/{data.pathwayId.toLowerCase()}/week/{data.weekNumber}" class="back-link">
			<img src="https://icons.hackclub.com/api/icons/8492a6/back" alt="Back" width="20" height="20" />
			Back to Week {data.weekNumber}
		</a>

		{#if submitSuccess}
			<div class="success-card">
				<h1>Project Shipped!</h1>
				<p>Your project has been submitted successfully. Nice work!</p>
				<a href="/app/pathway/{data.pathwayId.toLowerCase()}/week/{data.weekNumber}" class="back-btn">
					Back to Week {data.weekNumber}
				</a>
			</div>
		{:else}
			<div class="form-card">
				<header>
					<div class="week-badge" style="background: #{pathway.color}">
						{pathway.label} · Week {data.weekNumber}
					</div>
					<h1>Ship Your Project</h1>
					<p class="subtitle">Submit the project you built this week.</p>
				</header>

				<form onsubmit={handleSubmit}>
					<section class="form-section">
						<h2>Project Details</h2>

						<div class="form-group">
							<label for="description">Tell us about your project</label>
							<textarea id="description" bind:value={description} required maxlength="2000" rows="3" placeholder="What did you build? What does it do?"></textarea>
						</div>

						<div class="form-row">
							<div class="form-group">
								<label for="codeUrl">Link to your code</label>
								<input type="url" id="codeUrl" bind:value={codeUrl} required placeholder="https://github.com/username/repo" pattern="https://github\.com/.+/.+" title="Must be a GitHub link (https://github.com/username/repo)" />
							</div>
							<div class="form-group">
								<label for="playableUrl">Link to try it out</label>
								<input type="url" id="playableUrl" bind:value={playableUrl} required placeholder="https://..." />
							</div>
						</div>

						<div class="form-group">
							<label for="hackatimeProject">Hackatime Project Name</label>
							<input type="text" id="hackatimeProject" bind:value={hackatimeProject} required maxlength="200" placeholder="my-cool-project" />
						</div>

						<div class="form-group">
							<label for="hoursSpent">How many hours did you spend on your project?</label>
							<p class="section-hint">If you're using hackatime, enter the amount of hours it shows on your project.</p>
							<input type="number" id="hoursSpent" bind:value={hoursSpent} required min="0" step="any" placeholder="e.g. 12.5" />
						</div>

						<div class="form-group">
							<label for="screenshot">Screenshot of your project</label>
							<div class="file-upload">
								<input type="file" id="screenshot" accept="image/png,image/jpeg,image/gif,image/webp" onchange={handleScreenshot} required />
								<p class="file-hint">PNG, JPEG, GIF, or WebP · Max 5MB</p>
							</div>
							{#if screenshotPreview}
								<img src={screenshotPreview} alt="Screenshot preview" class="screenshot-preview" />
							{/if}
						</div>
					</section>

					<section class="form-section">
						<h2>About You</h2>

						<div class="form-row">
							<div class="form-group">
								<label for="firstName">First Name</label>
								<input type="text" id="firstName" bind:value={firstName} required maxlength="100" />
							</div>
							<div class="form-group">
								<label for="lastName">Last Name</label>
								<input type="text" id="lastName" bind:value={lastName} required maxlength="100" />
							</div>
						</div>

						<div class="form-row">
							<div class="form-group">
								<label for="email">Email</label>
								<input type="email" id="email" bind:value={email} required maxlength="254" />
							</div>
							<div class="form-group">
								<label for="githubUsername">GitHub Username</label>
								<input type="text" id="githubUsername" bind:value={githubUsername} required maxlength="100" placeholder="octocat" />
							</div>
						</div>

						<div class="form-group">
							<label for="birthday">Birthday</label>
							<input type="date" id="birthday" bind:value={birthday} required />
						</div>
					</section>

					<section class="form-section">
						<h2>Shipping Address</h2>
						<p class="section-hint">Where should we send any swag or rewards?</p>

						<div class="form-group">
							<label for="addressLine1">Address Line 1</label>
							<input type="text" id="addressLine1" bind:value={addressLine1} required maxlength="200" placeholder="123 Main St" />
						</div>

						<div class="form-group">
							<label for="addressLine2">Address Line 2 <span class="optional">(optional)</span></label>
							<input type="text" id="addressLine2" bind:value={addressLine2} maxlength="200" placeholder="Apt 4B" />
						</div>

						<div class="form-row">
							<div class="form-group">
								<label for="city">City</label>
								<input type="text" id="city" bind:value={city} required maxlength="100" />
							</div>
							<div class="form-group">
								<label for="stateProvince">State / Province</label>
								<input type="text" id="stateProvince" bind:value={stateProvince} required maxlength="100" />
							</div>
						</div>

						<div class="form-row">
							<div class="form-group">
								<label for="country">Country</label>
								<input type="text" id="country" bind:value={country} required maxlength="100" />
							</div>
							<div class="form-group">
								<label for="zipPostalCode">ZIP / Postal Code</label>
								<input type="text" id="zipPostalCode" bind:value={zipPostalCode} required maxlength="20" />
							</div>
						</div>
					</section>

					<section class="form-section">
						<h2>Feedback</h2>

						<div class="form-group">
							<label for="howDidYouHear">How did you hear about this? <span class="optional">(optional)</span></label>
							<input type="text" id="howDidYouHear" bind:value={howDidYouHear} maxlength="500" />
						</div>

						<div class="form-group">
							<label for="doingWell">What are we doing well? <span class="optional">(optional)</span></label>
							<textarea id="doingWell" bind:value={doingWell} maxlength="1000" rows="2"></textarea>
						</div>

						<div class="form-group">
							<label for="improvements">How can we improve? <span class="optional">(optional)</span></label>
							<textarea id="improvements" bind:value={improvements} maxlength="1000" rows="2"></textarea>
						</div>
					</section>

					{#if submitError}
						<div class="error-message">{submitError}</div>
					{/if}

					<button type="submit" class="submit-btn" disabled={isSubmitting}>
						{isSubmitting ? 'Submitting...' : 'Ship It!'}
					</button>
				</form>
			</div>
		{/if}
	</div>
</PlatformBackground>

<style>
	.ship-container {
		min-height: 100vh;
		padding: 2rem;
		color: #1a1a2e;
		max-width: 900px;
		margin: 0 auto;
	}

	.back-link {
		display: inline-flex;
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

	.form-card {
		background: rgba(255, 255, 255, 0.95);
		border: 1px solid #af98ff;
		border-radius: 16px;
		padding: 2.5rem;
	}

	header {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.week-badge {
		display: inline-block;
		padding: 0.25rem 0.75rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 600;
		color: white;
		margin-bottom: 0.75rem;
	}

	h1 {
		font-size: 2rem;
		margin: 0;
		line-height: 1.3;
	}

	.subtitle {
		color: #8492a6;
		margin: 0.5rem 0 0 0;
	}

	.form-section {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.form-section:last-of-type {
		border-bottom: none;
	}

	.form-section h2 {
		font-size: 1.25rem;
		margin: 0 0 0.25rem 0;
		color: #1a1a2e;
	}

	.section-hint {
		color: #8492a6;
		font-size: 0.875rem;
		margin: 0 0 1rem 0;
	}

	.form-group {
		margin-bottom: 1.25rem;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	label {
		display: block;
		font-size: 0.875rem;
		font-weight: 600;
		color: #1a1a2e;
		margin-bottom: 0.375rem;
	}

	.optional {
		font-weight: 400;
		color: #8492a6;
	}

	input[type='text'],
	input[type='url'],
	input[type='email'],
	input[type='date'],
	input[type='number'],
	textarea {
		width: 100%;
		padding: 0.625rem 0.75rem;
		border: 1px solid #d0d5dd;
		border-radius: 8px;
		font-size: 0.9rem;
		font-family: 'Kodchasan', sans-serif;
		color: #1a1a2e;
		background: white;
		transition: border-color 0.2s ease;
		box-sizing: border-box;
	}

	input:focus,
	textarea:focus {
		outline: none;
		border-color: #af98ff;
	}

	textarea {
		resize: vertical;
	}

	.file-upload input[type='file'] {
		width: 100%;
		padding: 0.625rem 0.75rem;
		border: 1px dashed #d0d5dd;
		border-radius: 8px;
		font-size: 0.9rem;
		font-family: 'Kodchasan', sans-serif;
		color: #1a1a2e;
		background: #fafafa;
		cursor: pointer;
	}

	.file-hint {
		font-size: 0.8rem;
		color: #8492a6;
		margin: 0.25rem 0 0 0;
	}

	.screenshot-preview {
		margin-top: 0.75rem;
		max-width: 100%;
		max-height: 200px;
		border-radius: 8px;
		border: 1px solid #e0e0e0;
		object-fit: contain;
	}

	.error-message {
		background: #fef2f2;
		color: #ec3750;
		padding: 0.75rem 1rem;
		border-radius: 8px;
		border: 1px solid #fecaca;
		font-size: 0.9rem;
		margin-bottom: 1.25rem;
	}

	.submit-btn {
		width: 100%;
		padding: 0.875rem;
		background: #33d6a6;
		border: 1px solid #33d6a6;
		color: white;
		font-size: 1.1rem;
		font-weight: 600;
		border-radius: 12px;
		cursor: pointer;
		font-family: 'Kodchasan', sans-serif;
		transition: background 0.2s ease;
	}

	.submit-btn:hover:not(:disabled) {
		background: #2bc299;
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.success-card {
		background: rgba(255, 255, 255, 0.95);
		border: 1px solid #33d6a6;
		border-radius: 16px;
		padding: 3rem;
		text-align: center;
	}

	.success-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.success-card h1 {
		color: #33d6a6;
		margin-bottom: 0.5rem;
	}

	.success-card p {
		color: #8492a6;
		margin-bottom: 2rem;
	}

	.back-btn {
		display: inline-block;
		padding: 0.75rem 2rem;
		background: #33d6a6;
		color: white;
		text-decoration: none;
		border-radius: 12px;
		font-weight: 600;
		font-family: 'Kodchasan', sans-serif;
	}

	.back-btn:hover {
		background: #2bc299;
	}

	@media (max-width: 768px) {
		.ship-container {
			padding: 1rem;
		}

		.form-card {
			padding: 1.5rem;
		}

		.form-row {
			grid-template-columns: 1fr;
		}

		h1 {
			font-size: 1.5rem;
		}
	}
</style>
