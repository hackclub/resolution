<script lang="ts">
	import note2 from '$lib/assets/sticky_note_2.png';

	let {
		title = "Event 2"
	} = $props();
</script>

<div class="event-card-2">
	<div class="card-inner">
		<img src={note2} alt="" class="note-bg" />
		<div class="event-content">
			<h3 class="event-title">{title}</h3>
		</div>
	</div>
</div>

<style>
	.event-card-2 {
		position: relative;
		width: 100%;
		max-width: 400px;
	}

	.card-inner {
		position: relative;
		transform: rotate(12deg);
		filter: drop-shadow(0px 8px 6.3px rgba(0, 0, 0, 0.25));
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
		padding: 15% 10%;
		box-sizing: border-box;
	}

	.event-title {
		font-family: 'Kodchasan', sans-serif;
		font-weight: 400;
		color: #a58d28;
		font-size: clamp(1.5rem, 4vw, 3rem);
		text-align: center;
		margin: 0;
	}
</style>
