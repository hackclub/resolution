<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let step = $state(1);

	let firstName = $state('');
	let lastName = $state('');
	let email = $state('');
	let phone = $state('');

	let addressLine1 = $state('');
	let addressLine2 = $state('');
	let city = $state('');
	let stateProvince = $state('');
	let postalCode = $state('');
	let country = $state('US');

	let notes = $state('');
	let tagsArray = $state<string[]>([]);
	let tagInput = $state('');

	let tagSuggestions = $derived(() => {
		const q = tagInput.trim().toLowerCase();
		if (!q) return [];
		return data.allTags.filter(
			(t) => t.toLowerCase().includes(q) && !tagsArray.includes(t)
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

	const countries = [
		{ code: 'US', name: 'United States' },
		{ code: 'CA', name: 'Canada' },
		{ code: 'GB', name: 'United Kingdom' },
		{ code: 'AU', name: 'Australia' },
		{ code: 'DE', name: 'Germany' },
		{ code: 'FR', name: 'France' },
		{ code: 'IN', name: 'India' },
		{ code: 'JP', name: 'Japan' },
		{ code: 'BR', name: 'Brazil' },
		{ code: 'MX', name: 'Mexico' },
		{ code: 'NL', name: 'Netherlands' },
		{ code: 'IT', name: 'Italy' },
		{ code: 'ES', name: 'Spain' },
		{ code: 'SE', name: 'Sweden' },
		{ code: 'NO', name: 'Norway' },
		{ code: 'DK', name: 'Denmark' },
		{ code: 'FI', name: 'Finland' },
		{ code: 'IE', name: 'Ireland' },
		{ code: 'NZ', name: 'New Zealand' },
		{ code: 'SG', name: 'Singapore' },
		{ code: 'KR', name: 'South Korea' },
		{ code: 'PH', name: 'Philippines' },
		{ code: 'MY', name: 'Malaysia' },
		{ code: 'TH', name: 'Thailand' },
		{ code: 'ID', name: 'Indonesia' },
		{ code: 'PL', name: 'Poland' },
		{ code: 'CZ', name: 'Czech Republic' },
		{ code: 'AT', name: 'Austria' },
		{ code: 'CH', name: 'Switzerland' },
		{ code: 'BE', name: 'Belgium' },
		{ code: 'PT', name: 'Portugal' },
		{ code: 'RO', name: 'Romania' },
		{ code: 'HU', name: 'Hungary' },
		{ code: 'GR', name: 'Greece' },
		{ code: 'IL', name: 'Israel' },
		{ code: 'AE', name: 'United Arab Emirates' },
		{ code: 'ZA', name: 'South Africa' },
		{ code: 'AR', name: 'Argentina' },
		{ code: 'CL', name: 'Chile' },
		{ code: 'CO', name: 'Colombia' },
		{ code: 'PK', name: 'Pakistan' },
		{ code: 'BD', name: 'Bangladesh' },
		{ code: 'NG', name: 'Nigeria' },
		{ code: 'KE', name: 'Kenya' },
		{ code: 'GH', name: 'Ghana' },
		{ code: 'TW', name: 'Taiwan' },
		{ code: 'HK', name: 'Hong Kong' },
		{ code: 'TR', name: 'Turkey' },
		{ code: 'EG', name: 'Egypt' },
		{ code: 'SA', name: 'Saudi Arabia' },
		{ code: 'PE', name: 'Peru' },
		{ code: 'UA', name: 'Ukraine' },
		{ code: 'HR', name: 'Croatia' },
		{ code: 'BG', name: 'Bulgaria' },
		{ code: 'RS', name: 'Serbia' },
		{ code: 'SK', name: 'Slovakia' },
		{ code: 'LT', name: 'Lithuania' },
		{ code: 'LV', name: 'Latvia' },
		{ code: 'EE', name: 'Estonia' },
		{ code: 'SI', name: 'Slovenia' },
		{ code: 'IS', name: 'Iceland' },
		{ code: 'LK', name: 'Sri Lanka' },
		{ code: 'VN', name: 'Vietnam' },
		{ code: 'CN', name: 'China' }
	];

	let itemQuantities = $state<Record<string, number>>({});
	let itemSizing = $state<Record<string, string>>({});
	let searchQuery = $state('');

	type ItemType = (typeof data.items)[number];

	let searchResults = $derived(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return [];
		return data.items.filter(
			(item) =>
				item.name.toLowerCase().includes(q) ||
				item.sku.toLowerCase().includes(q)
		);
	});

	let addedItems = $derived(() => {
		return data.items.filter((item) => (itemQuantities[item.id] || 0) > 0);
	});

	let selectedItems = $derived(() => {
		return data.items
			.filter((item) => (itemQuantities[item.id] || 0) > 0)
			.map((item) => ({
				warehouseItemId: item.id,
				quantity: itemQuantities[item.id],
				sizingChoice: itemSizing[item.id] || null
			}));
	});

	interface ShippingRate {
		serviceName: string;
		serviceCode: string;
		priceDetails: { base: number; gst: number; pst: number; hst: number; total: number };
		deliveryDate: string;
		transitDays: string;
		isLettermail?: boolean;
		note?: string;
	}

	let estimateLoading = $state(false);
	let estimateError = $state('');
	let estimatedRates = $state<ShippingRate[]>([]);
	let hasEstimated = $state(false);
	let selectedRate = $state<ShippingRate | null>(null);

	function addItem(item: ItemType) {
		if (!itemQuantities[item.id] || itemQuantities[item.id] === 0) {
			itemQuantities[item.id] = 1;
		}
		searchQuery = '';
	}

	function computePackageTotals() {
		const items = addedItems();
		let totalWeight = 0;
		let maxLength = 0;
		let maxWidth = 0;
		let totalHeight = 0;
		let hasBox = false;

		for (const item of items) {
			const qty = itemQuantities[item.id] || 0;
			totalWeight += item.weightGrams * qty;
			maxLength = Math.max(maxLength, item.lengthIn);
			maxWidth = Math.max(maxWidth, item.widthIn);
			totalHeight += item.heightIn * qty;
			if (item.packageType === 'box') hasBox = true;
		}

		const packageType = hasBox || totalHeight > 0.5 ? 'box' : 'flat';
		return { weight: totalWeight, length: maxLength, width: maxWidth, height: totalHeight, packageType };
	}

	async function estimateShipping() {
		estimateLoading = true;
		estimateError = '';
		estimatedRates = [];
		selectedRate = null;

		try {
			const pkg = computePackageTotals();
			const body: Record<string, unknown> = {
				country,
				street: addressLine1,
				city,
				province: stateProvince,
				postalCode: postalCode || undefined,
				weight: pkg.weight,
				packageType: pkg.packageType,
				length: pkg.length,
				width: pkg.width
			};
			if (pkg.packageType === 'box') {
				body.height = pkg.height;
			}

			const res = await fetch('/api/shipping-rates', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({ message: 'Estimation failed' }));
				estimateError = err.message || 'Estimation failed';
				return;
			}

			const result = await res.json();
			estimatedRates = result.rates || [];
			hasEstimated = true;
		} catch {
			estimateError = 'Failed to connect to shipping API.';
		} finally {
			estimateLoading = false;
		}
	}

	let itemsCostCents = $derived(() => {
		let total = 0;
		for (const item of addedItems()) {
			total += item.costCents * (itemQuantities[item.id] || 0);
		}
		return total;
	});

	let countryName = $derived(() => {
		return countries.find((c) => c.code === country)?.name || country;
	});

	function canAdvance(s: number): boolean {
		if (s === 1) return !!firstName && !!lastName && !!email && !!addressLine1 && !!city && !!stateProvince && !!postalCode && !!country;
		if (s === 2) return addedItems().length > 0;
		if (s === 3) return !!selectedRate;
		if (s === 4) return true;
		return false;
	}

	function nextStep() {
		if (!canAdvance(step)) return;
		if (step === 2) {
			estimateShipping();
		}
		step++;
	}

	function prevStep() {
		if (step > 1) step--;
	}

	function formatUsd(cents: number): string {
		return `$${(cents / 100).toFixed(2)}`;
	}
</script>

<div class="steps-indicator">
	{#each ['Address', 'Items', 'Shipping', 'Notes', 'Review'] as label, i}
		<button
			type="button"
			class="step-dot"
			class:active={step === i + 1}
			class:completed={step > i + 1}
			disabled={i + 1 > step}
			onclick={() => { if (i + 1 < step) step = i + 1; }}
		>
			<span class="step-num">{i + 1}</span>
			<span class="step-label">{label}</span>
		</button>
		{#if i < 4}
			<div class="step-line" class:filled={step > i + 1}></div>
		{/if}
	{/each}
</div>

<form method="POST" action="?/createOrder" use:enhance>
	<!-- Step 1: Address -->
	{#if step === 1}
		<section class="card">
			<h3 class="section-heading">Recipient Info</h3>
			<div class="form-grid">
				<label class="field">
					<span class="label">First Name <span class="required">*</span></span>
					<input type="text" bind:value={firstName} required />
				</label>
				<label class="field">
					<span class="label">Last Name <span class="required">*</span></span>
					<input type="text" bind:value={lastName} required />
				</label>
			</div>
			<label class="field">
				<span class="label">Email <span class="required">*</span></span>
				<input type="email" bind:value={email} required />
			</label>
			<label class="field">
				<span class="label">Phone</span>
				<input type="tel" bind:value={phone} />
			</label>
		</section>

		<section class="card">
			<h3 class="section-heading">Shipping Address</h3>
			<label class="field">
				<span class="label">Address Line 1 <span class="required">*</span></span>
				<input type="text" bind:value={addressLine1} required />
			</label>
			<label class="field">
				<span class="label">Address Line 2</span>
				<input type="text" bind:value={addressLine2} />
			</label>
			<div class="form-grid">
				<label class="field">
					<span class="label">City <span class="required">*</span></span>
					<input type="text" bind:value={city} required />
				</label>
				<label class="field">
					<span class="label">State / Province <span class="required">*</span></span>
					<input type="text" bind:value={stateProvince} required />
				</label>
			</div>
			<div class="form-grid">
				<label class="field">
					<span class="label">Postal Code <span class="required">*</span></span>
					<input type="text" bind:value={postalCode} required />
				</label>
				<label class="field">
					<span class="label">Country <span class="required">*</span></span>
					<select bind:value={country} required>
						{#each countries as c}
							<option value={c.code}>{c.name}</option>
						{/each}
					</select>
				</label>
			</div>
		</section>
	{/if}

	<!-- Step 2: Items -->
	{#if step === 2}
		<section class="card">
			<h3 class="section-heading">Select Items</h3>
			<div class="search-wrapper">
				<input
					type="text"
					class="search-input"
					placeholder="Search items by name or SKU..."
					bind:value={searchQuery}
				/>
				{#if searchResults().length > 0}
					<ul class="search-dropdown">
						{#each searchResults() as item (item.id)}
							<li>
								<button type="button" class="search-result-btn" onclick={() => addItem(item)}>
									<span class="result-name">{item.name}</span>
									<code>{item.sku}</code>
								</button>
							</li>
						{/each}
					</ul>
				{:else if searchQuery.trim().length > 0}
					<div class="search-no-results">No items found</div>
				{/if}
			</div>

			{#if addedItems().length > 0}
				<div class="items-table-wrapper">
					<table class="items-table">
						<thead>
							<tr>
								<th>Name</th>
								<th>SKU</th>
								<th>Sizing</th>
								<th>Quantity</th>
								<th></th>
							</tr>
						</thead>
						<tbody>
							{#each addedItems() as item (item.id)}
								{@const sizingOptions = item.sizing ? item.sizing.split(',').map((s) => s.trim()) : []}
								{@const qty = itemQuantities[item.id] || 0}
								<tr>
									<td class="item-name">{item.name}</td>
									<td><code>{item.sku}</code></td>
									<td>
										{#if sizingOptions.length > 0}
											<select
												class="sizing-select"
												value={itemSizing[item.id] || ''}
												onchange={(e) => itemSizing[item.id] = (e.target as HTMLSelectElement).value}
												required={qty > 0}
											>
												<option value="">Select size</option>
												{#each sizingOptions as size}
													<option value={size}>{size}</option>
												{/each}
											</select>
										{:else}
											<span class="hint">—</span>
										{/if}
									</td>
									<td>
										<input
											type="number"
											class="qty-input"
											min="1"
											value={qty}
											oninput={(e) => { itemQuantities[item.id] = parseInt((e.target as HTMLInputElement).value) || 0; }}
										/>
									</td>
									<td>
										<button
											type="button"
											class="remove-btn"
											onclick={() => { itemQuantities[item.id] = 0; delete itemSizing[item.id]; }}
										>✕</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="hint" style="margin-top: 1rem;">Search above to add items to your order.</p>
			{/if}
		</section>
	{/if}

	<!-- Step 3: Shipping Estimate (choose a rate) -->
	{#if step === 3}
		<section class="card">
			<h3 class="section-heading">Choose Shipping</h3>
			{#if estimateLoading}
				<p class="hint">Estimating shipping costs...</p>
			{:else if estimateError}
				<p class="estimate-error">{estimateError}</p>
				<button type="button" class="nav-btn" onclick={estimateShipping} style="margin-top: 0.75rem;">Retry</button>
			{:else if hasEstimated && estimatedRates.length > 0}
				<div class="rates-list">
					{#each estimatedRates as rate}
						<button
							type="button"
							class="rate-card"
							class:rate-selected={selectedRate?.serviceCode === rate.serviceCode}
							onclick={() => selectedRate = rate}
						>
							<div class="rate-header">
								<span class="rate-name">{rate.serviceName}</span>
								<span class="rate-price">${rate.priceDetails.total.toFixed(2)} <span class="rate-currency">USD</span></span>
							</div>
							<div class="rate-details">
								<span>Transit: {rate.transitDays} days</span>
								{#if rate.note}
									<span class="rate-note">{rate.note}</span>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			{:else if hasEstimated}
				<p class="hint">No shipping rates available for this destination.</p>
			{/if}
		</section>
	{/if}

	<!-- Step 4: Notes & Tags -->
	{#if step === 4}
		<section class="card">
			<h3 class="section-heading">Notes & Tags</h3>
			<label class="field">
				<span class="label">Notes</span>
				<textarea bind:value={notes} rows="3"></textarea>
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
			</div>
		</section>
	{/if}

	<!-- Step 5: Review & Submit -->
	{#if step === 5}
		<section class="card">
			<h3 class="section-heading">Order Summary</h3>

			<div class="summary-section">
				<h4 class="summary-label">Ship To</h4>
				<p>{firstName} {lastName}</p>
				<p>{addressLine1}{addressLine2 ? `, ${addressLine2}` : ''}</p>
				<p>{city}, {stateProvince} {postalCode}</p>
				<p>{countryName()}</p>
				<p class="hint">{email}{phone ? ` · ${phone}` : ''}</p>
			</div>

			<div class="summary-section">
				<h4 class="summary-label">Items</h4>
				<table class="items-table summary-table">
					<thead>
						<tr>
							<th>Item</th>
							<th>Qty</th>
							<th>Cost</th>
						</tr>
					</thead>
					<tbody>
						{#each addedItems() as item}
							{@const qty = itemQuantities[item.id] || 0}
							<tr>
								<td class="item-name">
									{item.name}
									{#if itemSizing[item.id]}
										<span class="hint"> — {itemSizing[item.id]}</span>
									{/if}
								</td>
								<td>{qty}</td>
								<td>{formatUsd(item.costCents * qty)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			{#if selectedRate}
				<div class="summary-section">
					<h4 class="summary-label">Shipping</h4>
					<p>{selectedRate.serviceName} — <strong>${selectedRate.priceDetails.total.toFixed(2)}</strong></p>
					<p class="hint">Transit: {selectedRate.transitDays} days</p>
				</div>
			{/if}

			{#if notes || tagsArray.length > 0}
				<div class="summary-section">
					<h4 class="summary-label">Notes & Tags</h4>
					{#if notes}<p>{notes}</p>{/if}
					{#if tagsArray.length > 0}
						<div class="summary-tags">
							{#each tagsArray as tag}
								<span class="tag-chip-readonly">{tag}</span>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			<div class="summary-total">
				<div class="total-row">
					<span>Items</span>
					<span>{formatUsd(itemsCostCents())}</span>
				</div>
				{#if selectedRate}
					<div class="total-row">
						<span>Shipping</span>
						<span>${selectedRate.priceDetails.total.toFixed(2)}</span>
					</div>
					<div class="total-row total-final">
						<span>Total</span>
						<span>{formatUsd(itemsCostCents() + Math.round(selectedRate.priceDetails.total * 100))}</span>
					</div>
				{/if}
			</div>
		</section>

		<!-- Hidden form fields for submission -->
		<input type="hidden" name="firstName" value={firstName} />
		<input type="hidden" name="lastName" value={lastName} />
		<input type="hidden" name="email" value={email} />
		<input type="hidden" name="phone" value={phone} />
		<input type="hidden" name="addressLine1" value={addressLine1} />
		<input type="hidden" name="addressLine2" value={addressLine2} />
		<input type="hidden" name="city" value={city} />
		<input type="hidden" name="stateProvince" value={stateProvince} />
		<input type="hidden" name="postalCode" value={postalCode} />
		<input type="hidden" name="country" value={country} />
		<input type="hidden" name="notes" value={notes} />
		<input type="hidden" name="tags" value={tagsArray.join(',')} />
		<input type="hidden" name="items" value={JSON.stringify(selectedItems())} />
	{/if}

	<!-- Navigation -->
	<div class="nav-row">
		{#if step > 1}
			<button type="button" class="nav-btn nav-back" onclick={prevStep}>← Back</button>
		{/if}
		<div class="nav-spacer"></div>
		{#if step < 5}
			<button type="button" class="nav-btn nav-next" onclick={nextStep} disabled={!canAdvance(step)}>
				Next →
			</button>
		{:else}
			<button type="submit" class="nav-btn nav-submit">Send to Warehouse</button>
		{/if}
	</div>
</form>

<style>
	.steps-indicator {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1.5rem;
		gap: 0;
	}

	.step-dot {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.25rem;
	}

	.step-dot:disabled {
		cursor: default;
	}

	.step-num {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-weight: 600;
		background: #e0e0e0;
		color: #8492a6;
		transition: all 0.2s;
	}

	.step-dot.active .step-num {
		background: #338eda;
		color: white;
	}

	.step-dot.completed .step-num {
		background: #27ae60;
		color: white;
	}

	.step-label {
		font-size: 0.7rem;
		color: #8492a6;
		white-space: nowrap;
	}

	.step-dot.active .step-label {
		color: #338eda;
		font-weight: 600;
	}

	.step-line {
		width: 32px;
		height: 2px;
		background: #e0e0e0;
		margin: 0 2px;
		margin-bottom: 1rem;
		transition: background 0.2s;
	}

	.step-line.filled {
		background: #27ae60;
	}

	form {
		display: flex;
		flex-direction: column;
	}

	.card {
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #af98ff;
		border-radius: 16px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.section-heading {
		font-size: 1.1rem;
		color: #338eda;
		margin: 0 0 1rem 0;
	}

	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-bottom: 0.75rem;
	}

	.label {
		font-size: 0.8rem;
		font-weight: 600;
		color: #8492a6;
	}

	.required {
		color: #ec3750;
	}

	input[type='text'],
	input[type='email'],
	input[type='tel'],
	textarea,
	select {
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 8px;
		font-size: 0.875rem;
		font-family: inherit;
		width: 100%;
		box-sizing: border-box;
	}

	textarea {
		resize: vertical;
	}

	.hint {
		color: #8492a6;
		font-size: 0.8rem;
	}

	.search-wrapper {
		position: relative;
		margin-bottom: 1rem;
	}

	.search-input {
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 8px;
		font-size: 0.875rem;
		font-family: inherit;
		width: 100%;
		box-sizing: border-box;
	}

	.search-dropdown {
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
		max-height: 200px;
		overflow-y: auto;
		z-index: 10;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.search-dropdown li {
		border-bottom: 1px solid #f0f0f0;
	}

	.search-dropdown li:last-child {
		border-bottom: none;
	}

	.search-result-btn {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.625rem 0.75rem;
		background: none;
		border: none;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.875rem;
		text-align: left;
	}

	.search-result-btn:hover {
		background: #f5f0ff;
	}

	.result-name {
		font-weight: 500;
	}

	.search-no-results {
		padding: 0.625rem 0.75rem;
		color: #8492a6;
		font-size: 0.85rem;
		margin-top: 4px;
	}

	.remove-btn {
		background: none;
		border: none;
		color: #e74c3c;
		cursor: pointer;
		font-size: 1rem;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	.remove-btn:hover {
		background: #fdecea;
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

	code {
		background: #f0f0f0;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		font-size: 0.8rem;
	}

	.sizing-select {
		width: auto;
		min-width: 100px;
	}

	.qty-input {
		width: 70px;
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 8px;
		font-size: 0.875rem;
		font-family: inherit;
		text-align: center;
	}

	.tag-input-wrapper {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.5rem;
		border: 1px solid #ccc;
		border-radius: 8px;
		background: white;
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
		white-space: nowrap;
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

	.tag-chip-readonly {
		display: inline-block;
		background: #eee8ff;
		color: #5b3cc4;
		padding: 0.2rem 0.5rem;
		border-radius: 6px;
		font-size: 0.8rem;
		font-weight: 500;
	}

	.summary-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		margin-top: 0.25rem;
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
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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

	.estimate-error {
		color: #e74c3c;
		font-size: 0.85rem;
		margin-top: 0.5rem;
	}

	.rates-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.rate-card {
		border: 2px solid #e0e0e0;
		border-radius: 8px;
		padding: 0.75rem 1rem;
		cursor: pointer;
		background: white;
		text-align: left;
		width: 100%;
		font-family: inherit;
		transition: border-color 0.15s;
	}

	.rate-card:hover {
		border-color: #af98ff;
	}

	.rate-card.rate-selected {
		border-color: #338eda;
		background: #f0f7ff;
	}

	.rate-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.rate-name {
		font-weight: 500;
		font-size: 0.875rem;
	}

	.rate-price {
		font-weight: 600;
		font-size: 0.95rem;
		color: #338eda;
	}

	.rate-currency {
		font-size: 0.75rem;
		font-weight: 400;
		color: #8492a6;
	}

	.rate-details {
		display: flex;
		gap: 1rem;
		margin-top: 0.25rem;
		font-size: 0.8rem;
		color: #8492a6;
	}

	.rate-note {
		font-style: italic;
	}

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

	.summary-table {
		margin-top: 0.5rem;
	}

	.summary-total {
		margin-top: 0.5rem;
	}

	.total-row {
		display: flex;
		justify-content: space-between;
		padding: 0.375rem 0;
		font-size: 0.875rem;
	}

	.total-final {
		border-top: 2px solid #338eda;
		margin-top: 0.375rem;
		padding-top: 0.625rem;
		font-weight: 700;
		font-size: 1rem;
		color: #338eda;
	}

	.nav-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.nav-spacer {
		flex: 1;
	}

	.nav-btn {
		border: none;
		border-radius: 8px;
		padding: 0.625rem 1.5rem;
		font-size: 0.9rem;
		cursor: pointer;
		font-family: inherit;
	}

	.nav-back {
		background: #e0e0e0;
		color: #333;
	}

	.nav-next {
		background: #338eda;
		color: white;
	}

	.nav-next:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.nav-submit {
		background: #27ae60;
		color: white;
	}

	.nav-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	@media (max-width: 768px) {
		.form-grid {
			grid-template-columns: 1fr;
		}

		.step-label {
			display: none;
		}
	}
</style>
