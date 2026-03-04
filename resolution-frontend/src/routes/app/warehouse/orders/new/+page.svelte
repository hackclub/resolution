<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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
	let tags = $state('');

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

	function addItem(item: ItemType) {
		if (!itemQuantities[item.id] || itemQuantities[item.id] === 0) {
			itemQuantities[item.id] = 1;
		}
		searchQuery = '';
		tryEstimate();
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

	function tryEstimate() {
		const items = addedItems();
		if (items.length === 0 || !addressLine1 || !city || !stateProvince || !country) {
			return;
		}
		estimateShipping();
	}

	async function estimateShipping() {
		estimateLoading = true;
		estimateError = '';
		estimatedRates = [];

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
</script>

<form method="POST" action="?/createOrder" use:enhance>
	<section class="card">
		<h3 class="section-heading">Recipient Info</h3>
		<div class="form-grid">
			<label class="field">
				<span class="label">First Name</span>
				<input type="text" name="firstName" bind:value={firstName} required />
			</label>
			<label class="field">
				<span class="label">Last Name</span>
				<input type="text" name="lastName" bind:value={lastName} required />
			</label>
		</div>
		<label class="field">
			<span class="label">Email</span>
			<input type="email" name="email" bind:value={email} required />
		</label>
		<label class="field">
			<span class="label">Phone</span>
			<input type="tel" name="phone" bind:value={phone} />
		</label>
	</section>

	<section class="card">
		<h3 class="section-heading">Shipping Address</h3>
		<label class="field">
			<span class="label">Address Line 1</span>
			<input type="text" name="addressLine1" bind:value={addressLine1} required />
		</label>
		<label class="field">
			<span class="label">Address Line 2</span>
			<input type="text" name="addressLine2" bind:value={addressLine2} />
		</label>
		<div class="form-grid">
			<label class="field">
				<span class="label">City</span>
				<input type="text" name="city" bind:value={city} required />
			</label>
			<label class="field">
				<span class="label">State / Province</span>
				<input type="text" name="stateProvince" bind:value={stateProvince} required />
			</label>
		</div>
		<div class="form-grid">
			<label class="field">
				<span class="label">Postal Code</span>
				<input type="text" name="postalCode" bind:value={postalCode} />
			</label>
			<label class="field">
				<span class="label">Country</span>
				<select name="country" bind:value={country} required>
					{#each countries as c}
						<option value={c.code}>{c.name}</option>
					{/each}
				</select>
			</label>
		</div>
	</section>

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
										oninput={(e) => { itemQuantities[item.id] = parseInt((e.target as HTMLInputElement).value) || 0; tryEstimate(); }}
									/>
								</td>
								<td>
									<button
										type="button"
										class="remove-btn"
										onclick={() => { itemQuantities[item.id] = 0; delete itemSizing[item.id]; tryEstimate(); }}
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
		<input type="hidden" name="items" value={JSON.stringify(selectedItems())} />
	</section>

	<section class="card">
		<h3 class="section-heading">Shipping Estimate</h3>
		{#if estimateLoading}
			<p class="hint">Estimating shipping costs...</p>
		{:else if estimateError}
			<p class="estimate-error">{estimateError}</p>
		{:else if hasEstimated && estimatedRates.length > 0}
			<div class="rates-list">
				{#each estimatedRates as rate}
					<div class="rate-card">
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
					</div>
				{/each}
			</div>
		{:else if hasEstimated}
			<p class="hint">No shipping rates available for this destination.</p>
		{:else}
			<p class="hint">Add items and fill in the shipping address to see estimates.</p>
		{/if}
	</section>

	<section class="card">
		<h3 class="section-heading">Notes & Tags</h3>
		<label class="field">
			<span class="label">Notes</span>
			<textarea name="notes" bind:value={notes} rows="3"></textarea>
		</label>
		<label class="field">
			<span class="label">Tags</span>
			<input type="text" name="tags" bind:value={tags} placeholder="e.g. club-event, spring-2026" />
		</label>
	</section>

	<button type="submit" class="submit-btn">Place Order</button>
</form>

<style>
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

	.estimate-error {
		color: #e74c3c;
		font-size: 0.85rem;
		margin-top: 0.5rem;
	}

	.rates-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.rate-card {
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 0.75rem 1rem;
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

	.submit-btn {
		background: #338eda;
		color: white;
		border: none;
		border-radius: 8px;
		padding: 0.625rem 1.5rem;
		font-size: 0.9rem;
		cursor: pointer;
		font-family: inherit;
		align-self: flex-start;
	}

	.submit-btn:hover {
		opacity: 0.9;
	}

	@media (max-width: 768px) {
		.form-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
