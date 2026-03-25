<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import SvelteMarkdown from 'svelte-marked';

	import { PATHWAY_INFO } from '$lib/pathways';

	let { data }: { data: PageData } = $props();

	const pathwayInfo = PATHWAY_INFO;

	const initialTitle = data.content?.title || '';
	const initialContent = data.content?.content || '';
	const initialPublished = data.content?.isPublished || false;

	let title = $state(initialTitle);
	let content = $state(initialContent);
	let isPublished = $state(initialPublished);
	let editorContainer = $state<HTMLDivElement | null>(null);
	let monacoEditor: any = null;
	let saving = $state(false);
	let showPreview = $state(false);

	const pathway = $derived(pathwayInfo[data.pathwayId]);



	onMount(() => {
		let editor: any = null;
		
		import('monaco-editor').then((monaco) => {
			if (!editorContainer) return;
			
			editor = monaco.editor.create(editorContainer, {
				value: content,
				language: 'markdown',
				theme: 'vs',
				minimap: { enabled: false },
				wordWrap: 'on',
				lineNumbers: 'off',
				fontSize: 14,
				fontFamily: 'monospace',
				padding: { top: 16, bottom: 16 },
				scrollBeyondLastLine: false,
				automaticLayout: true
			});

			editor.onDidChangeModelContent(() => {
				content = editor.getValue();
			});
			
			monacoEditor = editor;
		});

		return () => {
			editor?.dispose();
		};
	});
</script>

<svelte:head>
	<title>Edit Week {data.weekNumber} - {pathway.label} - Resolution</title>
</svelte:head>

<div class="editor-container">
		<header>
			<a href="/app/ambassador" class="back-link">
				<img src="https://icons.hackclub.com/api/icons/8492a6/back" alt="Back" width="20" height="20" />
				Back to Dashboard
			</a>
			<div class="header-content">
				<div class="header-info">
					<h1>{pathway.label} - Week {data.weekNumber}</h1>
					<span class="status-badge" class:published={isPublished}>
						{isPublished ? 'Published' : 'Draft'}
					</span>
				</div>
				<div class="header-actions">
					<button type="button" class="preview-btn" onclick={() => showPreview = !showPreview}>
						{showPreview ? 'Edit' : 'Preview'}
					</button>
					<form method="POST" action="?/togglePublish" use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'success') {
								isPublished = !isPublished;
							}
						};
					}}>
						<button type="submit" class="publish-btn" class:published={isPublished}>
							{isPublished ? 'Unpublish' : 'Publish'}
						</button>
					</form>
				</div>
			</div>
		</header>

		<form method="POST" action="?/save" use:enhance={() => {
			saving = true;
			return async ({ update }) => {
				await update();
				saving = false;
			};
		}}>
			<div class="title-row">
				<label for="title">Title</label>
				<input type="text" id="title" name="title" bind:value={title} placeholder="Enter week title..." />
			</div>

			<input type="hidden" name="content" value={content} />

			{#if showPreview}
				<div class="preview-container">
					<div class="preview-content prose">
						<SvelteMarkdown source={content} />
					</div>
				</div>
			{:else}
				<div class="editor-wrapper">
					<div class="monaco-container" bind:this={editorContainer}></div>
				</div>
			{/if}

			<div class="save-bar">
				<button type="submit" class="save-btn" disabled={saving}>
					{saving ? 'Saving...' : 'Save Changes'}
				</button>
			</div>
		</form>
	</div>

<style>
	.editor-container {
		min-height: 100vh;
		padding: 1.5rem;
		color: #1f2d3d;
		font-family: 'Phantom Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: #fff;
		display: flex;
		flex-direction: column;
	}

	header {
		margin-bottom: 1.5rem;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: #8492a6;
		text-decoration: none;
		font-size: 0.875rem;
		margin-bottom: 1rem;
	}

	.back-link:hover {
		color: #1a1a2e;
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.header-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	h1 {
		font-size: 1.5rem;
		margin: 0;
	}

	.status-badge {
		padding: 0.25rem 0.75rem;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 600;
		background: #ff8c37;
		color: white;
	}

	.status-badge.published {
		background: #33d6a6;
	}

	.header-actions {
		display: flex;
		gap: 0.75rem;
	}

	.preview-btn {
		padding: 0.5rem 1rem;
		background: white;
		border: 1px solid #af98ff;
		color: #af98ff;
		border-radius: 8px;
		cursor: pointer;
		font-family: inherit;
		font-weight: 500;
	}

	.preview-btn:hover {
		background: #f8f9fa;
	}

	.publish-btn {
		padding: 0.5rem 1rem;
		background: #33d6a6;
		border: none;
		color: white;
		border-radius: 8px;
		cursor: pointer;
		font-family: inherit;
		font-weight: 500;
	}

	.publish-btn.published {
		background: #8492a6;
	}

	.publish-btn:hover {
		opacity: 0.9;
	}

	form {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.title-row {
		margin-bottom: 1rem;
	}

	.title-row label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: 0.5rem;
		color: #8492a6;
	}

	.title-row input {
		width: 100%;
		padding: 0.75rem 1rem;
		font-size: 1rem;
		border: 1px solid #af98ff;
		border-radius: 8px;
		font-family: inherit;
		background: white;
	}

	.editor-wrapper {
		flex: 1;
		min-height: 400px;
		background: white;
		border: 1px solid #af98ff;
		border-radius: 8px;
		overflow: hidden;
	}

	.monaco-container {
		height: 100%;
		min-height: 400px;
	}

	.preview-container {
		flex: 1;
		min-height: 400px;
		background: white;
		border: 1px solid #af98ff;
		border-radius: 8px;
		padding: 1.5rem;
		overflow-y: auto;
	}

	.preview-content {
		max-width: 800px;
		margin: 0 auto;
	}

	.preview-content :global(h1) {
		font-size: 1.75rem;
		margin: 0 0 1rem 0;
	}

	.preview-content :global(h2) {
		font-size: 1.5rem;
		margin: 1.5rem 0 0.75rem 0;
	}

	.preview-content :global(h3) {
		font-size: 1.25rem;
		margin: 1.25rem 0 0.5rem 0;
	}

	.preview-content :global(p) {
		margin: 0 0 1rem 0;
		line-height: 1.6;
	}

	.preview-content :global(code) {
		background: #f0f0f0;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		font-size: 0.9em;
	}

	.preview-content :global(pre) {
		background: #1a1a2e;
		color: #f0f0f0;
		padding: 1rem;
		border-radius: 8px;
		overflow-x: auto;
		margin: 0 0 1rem 0;
	}

	.preview-content :global(pre code) {
		background: none;
		padding: 0;
	}

	.preview-content :global(ul),
	.preview-content :global(ol) {
		margin: 0 0 1rem 0;
		padding-left: 1.5rem;
	}

	.preview-content :global(li) {
		margin-bottom: 0.5rem;
	}

	.save-bar {
		margin-top: 1rem;
		display: flex;
		justify-content: flex-end;
	}

	.save-btn {
		padding: 0.75rem 2rem;
		background: #338eda;
		border: none;
		color: white;
		border-radius: 8px;
		cursor: pointer;
		font-family: inherit;
		font-weight: 600;
		font-size: 1rem;
	}

	.save-btn:hover {
		opacity: 0.9;
	}

	.save-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
