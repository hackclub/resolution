<script lang="ts">
	import note1 from '$lib/assets/sticky_note_1.png';

	let {
		title = "Event 1",
		description = "Lorem ipsum dolor sit amet consectetur adipiscing elit",
		imageSrc = ""
	} = $props();
</script>

<div class="event-card-1">
	<img src={note1} alt="" class="note-bg" />
	<div class="event-content">
		<h3 class="event-title">{title}</h3>
		{#if imageSrc}
			<div class="event-image">
				<img src={imageSrc} alt={title} />
			</div>
		{/if}
		<p class="event-description">{description}</p>
	</div>
</div>

<style>
	.event-card-1 {
		position: relative;
		width: 100%;
		max-width: 400px;
		filter: drop-shadow(0px 8px 4px rgba(0, 0, 0, 0.25));
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
		padding: 8% 10%;
		box-sizing: border-box;
	}

	.event-title {
		font-family: 'Kodchasan', sans-serif;
		font-weight: 400;
		color: #a58d28;
		font-size: clamp(1.5rem, 4vw, 3rem);
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
	}

	.event-description {
		font-family: 'Kodchasan', sans-serif;
		font-weight: 400;
		color: #a58d28;
		font-size: clamp(0.8rem, 2vw, 1.2rem);
		text-align: center;
		margin: 0;
		line-height: 1.4;
	}
</style>
