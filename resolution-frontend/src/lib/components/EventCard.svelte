<script lang="ts">
	import type { EventCardVariant } from '$lib/types';
	import note1 from '$lib/assets/sticky_note_1.png';
	import note2 from '$lib/assets/sticky_note_2.png';
	import note3 from '$lib/assets/sticky_note_3.png';
	import starImg from '$lib/assets/Asset 1@4x.avif';

	interface Props {
		title: string;
		description?: string;
		imageSrc?: string;
		variant?: EventCardVariant;
		rotation?: number;
		starCount?: number;
	}

	let {
		title,
		description = '',
		imageSrc = '',
		variant = 'yellow',
		rotation = 0,
		starCount = 0
	}: Props = $props();

	const noteImages: Record<EventCardVariant, string> = {
		yellow: note1,
		pink: note2,
		blue: note3
	};

	const noteImage = $derived(noteImages[variant]);
	const rotationStyle = $derived(rotation !== 0 ? `transform: rotate(${rotation}deg)` : '');
	const counterRotationStyle = $derived(rotation !== 0 ? `transform: rotate(${-rotation}deg)` : '');
</script>

<div class="event-card" class:has-rotation={rotation !== 0}>
	<div class="card-inner" style={rotationStyle}>
		<img src={noteImage} alt="" class="note-bg" />
		<div class="event-content" class:with-description={!!description}>
			{#if starCount > 0}
				<div class="stars-row">
					{#each Array(starCount) as _}
						<img src={starImg} alt="★" class="star-icon" />
					{/each}
				</div>
			{/if}
			<h3 class="event-title">{title}</h3>
			{#if imageSrc}
				<div class="event-image">
					<img src={imageSrc} alt={title} />
				</div>
			{/if}
			{#if description}
				<p class="event-description">{description}</p>
			{/if}
		</div>
	</div>
</div>

<style>
	.event-card {
		position: relative;
		width: 100%;
		filter: drop-shadow(var(--shadow-card));
	}

	.event-card.has-rotation {
		filter: drop-shadow(var(--shadow-card-lg));
	}

	.card-inner {
		position: relative;
	}

	.note-bg {
		width: 100%;
		height: auto;
		display: block;
	}

	.event-content {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		padding: 8% 5%;
		box-sizing: border-box;
	}

	.event-content.with-description {
		padding: 5% 5%;
	}

	.stars-row {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: clamp(0.25rem, 0.5vw, 0.5rem);
		margin-bottom: 3%;
	}

	.star-icon {
		width: clamp(24px, 4vw, 48px);
		height: auto;
		filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
	}

	.event-title {
		font-family: var(--font-primary);
		font-weight: 500;
		color: var(--color-gold-dark);
		font-size: clamp(1.1rem, 0.9rem + 0.6vw, 1.75rem);
		text-align: center;
		margin: 0 0 5% 0;
	}

	.event-image {
		width: 80%;
		margin-bottom: 5%;
	}

	.event-image img {
		width: 100%;
		height: auto;
		display: block;
		object-fit: cover;
		border-radius: 8px;
	}

	.event-description {
		font-family: var(--font-primary);
		font-weight: 400;
		color: var(--color-gold-dark);
		font-size: clamp(0.85rem, 0.75rem + 0.35vw, 1.1rem);
		text-align: center;
		margin: 0;
		line-height: 1.45;
	}
</style>
