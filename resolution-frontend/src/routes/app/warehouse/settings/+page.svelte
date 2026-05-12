<script lang="ts">
	let status = $state<'connecting' | 'connected' | 'error'>('connecting');
	let printers = $state<string[]>([]);
	let selectedPrinter = $state<string>('');
	let dpi = $state(203);
	let testPrintStatus = $state('');
	let qz: any = null;

	function loadSettings() {
		try {
			const saved = localStorage.getItem('warehouse-qz-settings');
			if (saved) {
				const parsed = JSON.parse(saved);
				if (parsed.printer) selectedPrinter = parsed.printer;
				if (parsed.dpi) dpi = parsed.dpi;
			}
		} catch {}
	}

	function saveSettings() {
		localStorage.setItem('warehouse-qz-settings', JSON.stringify({
			printer: selectedPrinter,
			dpi
		}));
	}

	async function initQZ() {
		// Wait for qz-tray script to load
		const maxWait = 10000;
		const start = Date.now();
		while (!(window as any).qz && Date.now() - start < maxWait) {
			await new Promise(r => setTimeout(r, 100));
		}
		
		qz = (window as any).qz;
		if (!qz) {
			status = 'error';
			return;
		}

		try {
			const certRes = await fetch('/api/qz/cert', { cache: 'no-store' });
			if (certRes.ok) {
				const certText = await certRes.text();
				if (certText && !certText.includes('not configured')) {
					qz.security.setCertificatePromise(function(resolve: any) { resolve(certText); });
					qz.security.setSignatureAlgorithm('SHA512');
					qz.security.setSignaturePromise(function(toSign: string) {
						return function(resolve: any, reject: any) {
							fetch('/api/qz/sign', { method: 'POST', cache: 'no-store', body: toSign, headers: { 'Content-Type': 'text/plain' } })
								.then((r: Response) => r.ok ? resolve(r.text()) : reject(r.text()));
						};
					});
				}
			}
		} catch {}

		try {
			if (!qz.websocket.isActive()) {
				await qz.websocket.connect();
			}
			status = 'connected';
			await refreshPrinters();
		} catch {
			status = 'error';
		}
	}

	async function refreshPrinters() {
		if (!qz || status !== 'connected') return;
		try {
			printers = await qz.printers.find();
		} catch {
			printers = [];
		}
	}

	async function testPrint() {
		if (!qz || !selectedPrinter) return;
		testPrintStatus = 'Printing...';
		try {
			const config = qz.configs.create(selectedPrinter, {
				colorType: 'blackwhite',
				density: dpi,
				units: 'in',
				rasterize: true,
				interpolation: 'nearest-neighbor',
				size: { width: 4, height: 6 }
			});
			// Print a simple test by creating a tiny PDF-like content
			// Use pixel type with HTML for a quick test
			const data = [{
				type: 'html',
				format: 'plain',
				data: `<div style="font-family:monospace;padding:20px;"><h2>Warehouse Test Print</h2><p>Printer: ${selectedPrinter}</p><p>DPI: ${dpi}</p><p>Time: ${new Date().toLocaleString()}</p><p>✓ QZ Tray is working!</p></div>`
			}];
			await qz.print(config, data);
			testPrintStatus = '✓ Test print sent!';
		} catch (e: any) {
			testPrintStatus = `✗ Print failed: ${e?.message || e}`;
		}
	}

	$effect(() => {
		loadSettings();
		initQZ();
	});

	$effect(() => {
		if (selectedPrinter || dpi) {
			saveSettings();
		}
	});
</script>

<svelte:head>
	<script src="https://unpkg.com/qz-tray@2.2.4/qz-tray.js"></script>
</svelte:head>

<section class="card">
	<h3 class="section-heading">QZ Tray Connection</h3>
	{#if status === 'connecting'}
		<div class="status-banner status-connecting">
			<span>⏳ Connecting to QZ Tray...</span>
		</div>
	{:else if status === 'connected'}
		<div class="status-banner status-connected">
			<span>✓ Connected to QZ Tray</span>
		</div>
	{:else}
		<div class="status-banner status-error">
			<span>✗ Could not connect to QZ Tray</span>
			<a href="https://qz.io/download" target="_blank" rel="noopener" class="download-link">Download QZ Tray</a>
		</div>
	{/if}
</section>

<section class="card">
	<h3 class="section-heading">Printer</h3>
	<div class="field-row">
		<label class="field">
			<span class="label">Select Printer</span>
			<div class="select-row">
				<select bind:value={selectedPrinter} disabled={status !== 'connected'} onchange={saveSettings}>
					<option value="">Pick a printer...</option>
					{#each printers as p}
						<option value={p}>{p}</option>
					{/each}
				</select>
				<button type="button" class="action-btn" onclick={refreshPrinters} disabled={status !== 'connected'}>
					↻ Refresh
				</button>
			</div>
		</label>
	</div>

	<div class="field-row">
		<span class="label">DPI</span>
		<div class="radio-group">
			{#each [203, 300, 305] as d}
				<label class="radio-label">
					<input type="radio" name="dpi" value={d} bind:group={dpi} onchange={saveSettings} />
					{d}
				</label>
			{/each}
		</div>
	</div>
</section>

<section class="card">
	<h3 class="section-heading">Test</h3>
	<button
		type="button"
		class="nav-btn nav-next"
		onclick={testPrint}
		disabled={status !== 'connected' || !selectedPrinter}
	>
		🖨️ Test Print
	</button>
	{#if testPrintStatus}
		<p class="hint" style="margin-top: 0.5rem;">{testPrintStatus}</p>
	{/if}
</section>

<style>
	.card {
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #af98ff;
		border-radius: 16px;
		padding: 1.5rem;
		margin-bottom: 1rem;
	}

	.section-heading {
		font-size: 1.1rem;
		margin: 0 0 1rem 0;
	}

	.status-banner {
		padding: 0.75rem 1rem;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: 0.9rem;
		font-weight: 500;
	}

	.status-connecting { background: #fff8e1; color: #f59e0b; }
	.status-connected { background: #e8fff0; color: #27ae60; }
	.status-error { background: #ffe8ea; color: #ec3750; }

	.download-link {
		color: #ec3750;
		font-weight: 600;
		text-decoration: underline;
	}

	.field-row {
		margin-bottom: 1rem;
	}

	.label {
		display: block;
		font-size: 0.8rem;
		font-weight: 600;
		color: #8492a6;
		margin-bottom: 0.375rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.select-row {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	select {
		flex: 1;
		padding: 0.5rem 0.75rem;
		border: 1px solid #ccc;
		border-radius: 8px;
		font-family: inherit;
		font-size: 0.875rem;
	}

	.action-btn {
		padding: 0.5rem 0.75rem;
		font-size: 0.8rem;
		background: rgba(255, 255, 255, 0.8);
		border: 1px solid #af98ff;
		color: #af98ff;
		cursor: pointer;
		border-radius: 6px;
		font-family: inherit;
	}

	.action-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 1);
	}

	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.radio-group {
		display: flex;
		gap: 1.5rem;
	}

	.radio-label {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.9rem;
		cursor: pointer;
	}

	.nav-btn {
		border: none;
		border-radius: 8px;
		padding: 0.625rem 1.5rem;
		font-size: 0.9rem;
		cursor: pointer;
		font-family: inherit;
	}

	.nav-next {
		background: #338eda;
		color: white;
	}

	.nav-next:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.nav-next:hover:not(:disabled) {
		opacity: 0.9;
	}

	.hint {
		color: #8492a6;
		font-size: 0.8rem;
	}

	.field {
		display: block;
	}
</style>
