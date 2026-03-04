<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let mode = $state<'index' | 'create' | 'map' | 'process'>('index');
	let activeBatchId = $state<string | null>(null);

	let title = $state('');
	let templateId = $state('');
	let tagsArray = $state<string[]>([]);
	let tagInput = $state('');
	let csvText = $state('');
	let csvFileName = $state('');

	let fieldMapping = $state<Record<string, string>>({});

	const requiredFields = ['firstName', 'lastName', 'email', 'addressLine1', 'city', 'stateProvince', 'postalCode', 'country'] as const;
	const allFields = ['firstName', 'lastName', 'email', 'phone', 'addressLine1', 'addressLine2', 'city', 'stateProvince', 'postalCode', 'country'] as const;

	const fieldLabels: Record<string, string> = {
		firstName: 'First Name',
		lastName: 'Last Name',
		email: 'Email',
		phone: 'Phone',
		addressLine1: 'Address Line 1',
		addressLine2: 'Address Line 2',
		city: 'City',
		stateProvince: 'State / Province',
		postalCode: 'Postal Code',
		country: 'Country'
	};

	const activeBatch = $derived(
		activeBatchId ? data.batches.find((b: any) => b.id === activeBatchId) ?? null : null
	);

	const csvHeaders = $derived(() => {
		if (!activeBatch) return [];
		const firstLine = activeBatch.csvData.split(/\r?\n/)[0];
		if (!firstLine) return [];
		const headers: string[] = [];
		let i = 0;
		while (i < firstLine.length) {
			if (firstLine[i] === '"') {
				let val = '';
				i++;
				while (i < firstLine.length) {
					if (firstLine[i] === '"' && i + 1 < firstLine.length && firstLine[i + 1] === '"') {
						val += '"';
						i += 2;
					} else if (firstLine[i] === '"') {
						i++;
						break;
					} else {
						val += firstLine[i];
						i++;
					}
				}
				headers.push(val);
				if (i < firstLine.length && firstLine[i] === ',') i++;
			} else {
				let val = '';
				while (i < firstLine.length && firstLine[i] !== ',') {
					val += firstLine[i];
					i++;
				}
				headers.push(val.trim());
				if (i < firstLine.length && firstLine[i] === ',') i++;
			}
		}
		return headers;
	});

	const mappingComplete = $derived(() => {
		return requiredFields.every((f) => fieldMapping[f] && fieldMapping[f] !== '');
	});

	const tagSuggestions = $derived(() => {
		const q = tagInput.trim().toLowerCase();
		if (!q) return [];
		return data.allTags.filter(
			(t: string) => t.toLowerCase().includes(q) && !tagsArray.includes(t)
		);
	});

	function addTag(tag: string) {
		const t = tag.trim().toLowerCase();
		if (t && !tagsArray.includes(t)) {
			tagsArray = [...tagsArray, t];
		}
		tagInput = '';
	}

	function removeTag(tag: string) {
		tagsArray = tagsArray.filter((t) => t !== tag);
	}

	function handleTagKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (tagInput.trim()) addTag(tagInput);
		} else if (e.key === 'Backspace' && !tagInput && tagsArray.length > 0) {
			tagsArray = tagsArray.slice(0, -1);
		}
	}

	function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		csvFileName = file.name;
		const reader = new FileReader();
		reader.onload = () => {
			csvText = reader.result as string;
		};
		reader.readAsText(file);
	}

	function statusLabel(status: string) {
		const map: Record<string, string> = {
			AWAITING_MAPPING: 'Awaiting Mapping',
			MAPPED: 'Mapped',
			PROCESSED: 'Processed'
		};
		return map[status] || status;
	}

	function statusClass(status: string) {
		const map: Record<string, string> = {
			AWAITING_MAPPING: 'status-awaiting',
			MAPPED: 'status-mapped',
			PROCESSED: 'status-processed'
		};
		return map[status] || '';
	}

	function openCreate() {
		title = '';
		templateId = '';
		tagsArray = [];
		tagInput = '';
		csvText = '';
		csvFileName = '';
		mode = 'create';
	}

	const autoMapAliases: Record<string, string[]> = {
		firstName: ['first name', 'first_name', 'firstname'],
		lastName: ['last name', 'last_name', 'lastname'],
		email: ['email', 'e-mail', 'email address'],
		addressLine1: ['line 1', 'line1', 'address line 1', 'address_line_1', 'address1', 'street', 'street address'],
		addressLine2: ['line 2', 'line2', 'address line 2', 'address_line_2', 'address2', 'apt', 'suite', 'unit'],
		city: ['city', 'town'],
		stateProvince: ['state/province', 'state', 'province', 'state_province', 'state / province', 'region'],
		postalCode: ['postal_code', 'postal code', 'postalcode', 'zip', 'zip code', 'zipcode', 'zip_code', 'postcode'],
		country: ['country', 'country code'],
		phone: ['phone number', 'phone', 'phone_number', 'telephone', 'tel', 'mobile']
	};

	function autoMapFields(headers: string[]): Record<string, string> {
		const mapping: Record<string, string> = {};
		const lowerHeaders = headers.map((h) => h.trim().toLowerCase());
		for (const [field, aliases] of Object.entries(autoMapAliases)) {
			const matchIndex = lowerHeaders.findIndex((h) => aliases.includes(h));
			if (matchIndex !== -1) {
				mapping[field] = headers[matchIndex];
			}
		}
		return mapping;
	}

	function openMap(batchId: string) {
		activeBatchId = batchId;
		fieldMapping = {};
		mode = 'map';
		// Auto-map after state updates so csvHeaders() resolves
		setTimeout(() => {
			const headers = csvHeaders();
			if (headers.length > 0) {
				fieldMapping = autoMapFields(headers);
			}
		}, 0);
	}

	function openProcess(batchId: string) {
		activeBatchId = batchId;
		mode = 'process';
	}

	function backToIndex() {
		mode = 'index';
		activeBatchId = null;
	}
</script>

{#if mode === 'index'}
	<div class="page-actions">
		<button type="button" class="new-batch-btn" onclick={openCreate}>+ New Batch</button>
	</div>

	{#if data.batches.length === 0}
		<div class="empty-state">
			<p>No batches yet.</p>
			<p class="hint">Create a batch to bulk-import orders from a CSV file.</p>
		</div>
	{:else}
		<section class="batches-section">
			<div class="items-table-wrapper">
				<table class="items-table">
					<thead>
						<tr>
							<th>ID</th>
							<th>Title</th>
							<th>Template</th>
							<th>Addresses</th>
							<th>Status</th>
							<th>Tags</th>
							<th>Created</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each data.batches as batch (batch.id)}
							<tr>
								<td><code>{batch.id.slice(0, 8)}</code></td>
								<td class="item-name">{batch.title || '—'}</td>
								<td>{batch.template.name}</td>
								<td>{batch.addressCount}</td>
								<td><span class="status-badge {statusClass(batch.status)}">{statusLabel(batch.status)}</span></td>
								<td>
									<div class="tags-cell">
										{#each batch.tags as tagObj}
											<span class="tag">{tagObj.tag}</span>
										{/each}
									</div>
								</td>
								<td class="hint">{new Date(batch.createdAt).toLocaleDateString()}</td>
								<td class="actions">
									{#if batch.status === 'AWAITING_MAPPING'}
										<button type="button" class="action-btn" onclick={() => openMap(batch.id)}>Map Fields</button>
									{:else if batch.status === 'MAPPED'}
										<button type="button" class="action-btn action-process" onclick={() => openProcess(batch.id)}>Process</button>
									{:else}
										<span class="hint">Completed</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}
{/if}

{#if mode === 'create'}
	<div class="page-actions">
		<button type="button" class="back-btn" onclick={backToIndex}>← Back</button>
	</div>
	<section class="card">
		<h3 class="section-heading">Create Batch</h3>
		<form method="POST" action="?/createBatch" use:enhance={() => {
			return async ({ result, update }) => {
				await update();
				if (result.type === 'success' && result.data?.batchId) {
					openMap(result.data.batchId as string);
				}
			};
		}}>
			<label class="field">
				<span class="label">Title</span>
				<input type="text" name="title" bind:value={title} placeholder="Optional batch title" />
			</label>

			<label class="field">
				<span class="label">Template</span>
				<select name="templateId" bind:value={templateId} required>
					<option value="">Select a template…</option>
					{#each data.templates as tpl}
						<option value={tpl.id}>{tpl.name} ({tpl.items.length} item{tpl.items.length !== 1 ? 's' : ''})</option>
					{/each}
				</select>
			</label>

			<div class="field">
				<span class="label">Tags</span>
				<div class="tag-input-wrapper">
					{#each tagsArray as tag}
						<span class="tag-chip">
							{tag}
							<button type="button" class="tag-remove" onclick={() => removeTag(tag)}>✕</button>
						</span>
					{/each}
					<div class="tag-input-container">
						<input
							type="text"
							class="tag-input"
							placeholder={tagsArray.length === 0 ? 'Type a tag and press Enter...' : ''}
							bind:value={tagInput}
							onkeydown={handleTagKeydown}
						/>
						{#if tagSuggestions().length > 0}
							<ul class="tag-suggestions">
								{#each tagSuggestions() as suggestion}
									<li>
										<button type="button" class="tag-suggestion-btn" onclick={() => addTag(suggestion)}>
											{suggestion}
										</button>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>
				<input type="hidden" name="tags" value={tagsArray.join(',')} />
			</div>

			<div class="field">
				<span class="label">CSV File</span>
				<a href="https://docs.google.com/spreadsheets/d/1XlGk_gY00d6BHmgN--zpZL8svwjqSWozNWCf9BPyReo/copy" target="_blank" rel="noopener" class="template-download">↓ Copy CSV template from Google Sheets</a>
			<span class="hint">Only accessible with Resolution emails</span>
				<input type="file" accept=".csv,text/csv" onchange={handleFileChange} required />
				{#if csvFileName}
					<p class="hint" style="margin-top: 0.375rem;">Loaded: {csvFileName}</p>
				{/if}
				<input type="hidden" name="csvData" value={csvText} />
			</div>

			<div class="form-actions">
				<button type="submit" class="submit-btn" disabled={!templateId || !csvText}>Create Batch</button>
			</div>
		</form>
	</section>
{/if}

{#if mode === 'map' && activeBatch}
	<div class="page-actions">
		<button type="button" class="back-btn" onclick={backToIndex}>← Back</button>
	</div>
	<section class="card">
		<h3 class="section-heading">Map CSV Fields</h3>
		<p class="hint" style="margin-bottom: 1rem;">
			Map each address field to a column from your CSV. CSV has {csvHeaders().length} column{csvHeaders().length !== 1 ? 's' : ''}.
		</p>
		<form method="POST" action="?/mapFields" use:enhance={() => {
			return async ({ result, update }) => {
				await update();
				if (result.type === 'success' && activeBatchId) {
					openProcess(activeBatchId);
				}
			};
		}}>
			<input type="hidden" name="batchId" value={activeBatch.id} />
			<input type="hidden" name="fieldMapping" value={JSON.stringify(fieldMapping)} />

			<div class="mapping-grid">
				{#each allFields as field}
					<div class="mapping-row">
						<span class="mapping-label">
							{fieldLabels[field]}
							{#if requiredFields.includes(field as any)}
								<span class="required-star">*</span>
							{/if}
						</span>
						<select
							class="mapping-select"
							value={fieldMapping[field] || ''}
							onchange={(e) => { fieldMapping[field] = (e.target as HTMLSelectElement).value; }}
						>
							<option value="">— Not mapped —</option>
							{#each csvHeaders() as header}
								<option value={header}>{header}</option>
							{/each}
						</select>
					</div>
				{/each}
			</div>

			<div class="form-actions">
				<button type="submit" class="submit-btn" disabled={!mappingComplete()}>Save Mapping</button>
			</div>
		</form>
	</section>
{/if}

{#if mode === 'process' && activeBatch}
	<div class="page-actions">
		<button type="button" class="back-btn" onclick={backToIndex}>← Back</button>
	</div>
	<section class="card">
		<h3 class="section-heading">Process Batch</h3>

		<div class="summary-section">
			<h4 class="summary-label">Batch</h4>
			<p>{activeBatch.title || 'Untitled batch'}</p>
			<p class="hint">{activeBatch.addressCount} address{activeBatch.addressCount !== 1 ? 'es' : ''}</p>
		</div>

		<div class="summary-section">
			<h4 class="summary-label">Template</h4>
			<p>{activeBatch.template.name}</p>
			{#each activeBatch.template.items as ti}
				<p class="hint">{ti.warehouseItem.name} × {ti.quantity}</p>
			{/each}
		</div>

		{#if activeBatch.tags.length > 0}
			<div class="summary-section">
				<h4 class="summary-label">Tags</h4>
				<div class="tags-cell">
					{#each activeBatch.tags as tagObj}
						<span class="tag">{tagObj.tag}</span>
					{/each}
				</div>
			</div>
		{/if}

		<form method="POST" action="?/processBatch" use:enhance={() => {
			return async ({ update }) => {
				await update();
				backToIndex();
			};
		}}>
			<input type="hidden" name="batchId" value={activeBatch.id} />
			<div class="form-actions">
				<button type="submit" class="submit-btn submit-process">Process Batch</button>
			</div>
		</form>
	</section>
{/if}

<style>
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
		font-size: 0.8rem;
	}

	.batches-section {
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #af98ff;
		border-radius: 16px;
		padding: 1.5rem;
	}

	.items-table-wrapper {
		overflow-x: auto;
	}

	.items-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.items-table th,
	.items-table td {
		text-align: left;
		padding: 0.75rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.items-table th {
		font-weight: 600;
		color: #8492a6;
		white-space: nowrap;
	}

	.item-name {
		font-weight: 500;
	}

	.status-badge {
		display: inline-block;
		padding: 0.2rem 0.5rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.status-awaiting { background: #fff8e1; color: #f5a623; }
	.status-mapped { background: #e8f4ff; color: #338eda; }
	.status-processed { background: #e8fff0; color: #33d6a6; }

	.actions {
		white-space: nowrap;
	}

	.action-btn {
		margin-right: 0.375rem;
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

	.action-process {
		border-color: #33d6a6;
		color: #33d6a6;
	}

	.tags-cell {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		align-items: center;
	}

	.tag {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		padding: 0.2rem 0.45rem;
		background: #f0edff;
		color: #6c5ce7;
		border-radius: 4px;
		font-size: 0.7rem;
	}

	.page-actions {
		margin-bottom: 1rem;
	}

	.new-batch-btn {
		display: inline-block;
		background: #338eda;
		color: white;
		border: none;
		border-radius: 8px;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-family: inherit;
		cursor: pointer;
	}

	.new-batch-btn:hover {
		opacity: 0.9;
	}

	.back-btn {
		display: inline-block;
		background: #e0e0e0;
		color: #333;
		border: none;
		border-radius: 8px;
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-family: inherit;
		cursor: pointer;
	}

	.back-btn:hover {
		opacity: 0.9;
	}

	.card {
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #af98ff;
		border-radius: 16px;
		padding: 1.5rem;
	}

	.section-heading {
		margin: 0 0 1rem 0;
		color: #338eda;
		font-size: 1.1rem;
	}

	.field {
		display: block;
		margin-bottom: 1rem;
	}

	.label {
		display: block;
		font-size: 0.8rem;
		font-weight: 600;
		color: #8492a6;
		margin-bottom: 0.375rem;
	}

	.field input[type='text'],
	.field input[type='file'],
	.field select {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border: 1px solid #ccc;
		border-radius: 8px;
		font-size: 0.875rem;
		font-family: inherit;
	}

	.field select {
		appearance: auto;
	}

	.template-download {
		display: inline-block;
		font-size: 0.8rem;
		color: #338eda;
		text-decoration: none;
		margin-bottom: 0.5rem;
	}

	.template-download:hover {
		text-decoration: underline;
	}

	.form-actions {
		margin-top: 1.25rem;
	}

	.submit-btn {
		background: #338eda;
		color: white;
		border: none;
		border-radius: 8px;
		padding: 0.625rem 1.5rem;
		font-size: 0.9rem;
		font-family: inherit;
		cursor: pointer;
	}

	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.submit-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.submit-process {
		background: #27ae60;
	}

	/* Tag input */
	.tag-input-wrapper {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		border: 1px solid #ccc;
		border-radius: 8px;
		min-height: 38px;
	}

	.tag-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		background: #eee8ff;
		color: #5b3cc4;
		padding: 0.2rem 0.5rem;
		border-radius: 6px;
		font-size: 0.8rem;
		font-weight: 500;
	}

	.tag-remove {
		background: none;
		border: none;
		color: #5b3cc4;
		cursor: pointer;
		font-size: 0.75rem;
		padding: 0;
		line-height: 1;
		opacity: 0.6;
	}

	.tag-remove:hover {
		opacity: 1;
	}

	.tag-input-container {
		position: relative;
		flex: 1;
		min-width: 120px;
	}

	.tag-input {
		border: none;
		outline: none;
		font-size: 0.875rem;
		font-family: inherit;
		width: 100%;
		padding: 0.125rem 0;
		background: transparent;
	}

	.tag-suggestions {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: white;
		border: 1px solid #ccc;
		border-radius: 8px;
		margin-top: 4px;
		padding: 0;
		list-style: none;
		max-height: 150px;
		overflow-y: auto;
		z-index: 10;
	}

	.tag-suggestions li {
		border-bottom: 1px solid #f0f0f0;
	}

	.tag-suggestions li:last-child {
		border-bottom: none;
	}

	.tag-suggestion-btn {
		width: 100%;
		padding: 0.5rem 0.75rem;
		background: none;
		border: none;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.85rem;
		text-align: left;
	}

	.tag-suggestion-btn:hover {
		background: #f5f0ff;
	}

	/* Field mapping */
	.mapping-grid {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.mapping-row {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.mapping-label {
		min-width: 140px;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.required-star {
		color: #ec3750;
	}

	.mapping-select {
		flex: 1;
		padding: 0.5rem 0.75rem;
		border: 1px solid #ccc;
		border-radius: 8px;
		font-size: 0.875rem;
		font-family: inherit;
		appearance: auto;
	}

	/* Process summary */
	.summary-section {
		margin-bottom: 1.25rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.summary-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: #8492a6;
		margin: 0 0 0.375rem 0;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.summary-section p {
		margin: 0.125rem 0;
		font-size: 0.875rem;
	}

	@media (max-width: 768px) {
		.mapping-row {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.375rem;
		}

		.mapping-label {
			min-width: auto;
		}

		.mapping-select {
			width: 100%;
		}
	}
</style>
