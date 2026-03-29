<script lang="ts">
	import { PATHWAY_LABELS } from '$lib/pathways';
	import * as d3 from 'd3';

	type PathwayBreakdown = {
		pathway: string;
		week1: number;
		week2: number;
		returned: number;
		droppedOff: number;
		newInWeek2: number;
		dropoffPct: number;
	};

	type DropOffData = {
		week1: number;
		week2: number;
		returned: number;
		droppedOff: number;
		newInWeek2: number;
		dropoffPct: number;
		pathwayBreakdown: PathwayBreakdown[];
	};

	let data = $state<DropOffData | null>(null);
	let fetchError = $state<string | null>(null);
	let loading = $state(true);
	let chartContainer: HTMLDivElement | undefined = $state();

	async function fetchData() {
		try {
			const res = await fetch('/api/analytics/dropoff');
			if (!res.ok) {
				const body = await res.json();
				fetchError = body.error || 'Failed to load';
				return;
			}
			data = await res.json();
		} catch {
			fetchError = 'Failed to fetch drop-off data';
		} finally {
			loading = false;
		}
	}

	function renderChart(container: HTMLDivElement, breakdown: PathwayBreakdown[]) {
		d3.select(container).selectAll('*').remove();

		const margin = { top: 20, right: 20, bottom: 60, left: 50 };
		const width = container.clientWidth - margin.left - margin.right;
		const height = 300 - margin.top - margin.bottom;

		const svg = d3
			.select(container)
			.append('svg')
			.attr('width', width + margin.left + margin.right)
			.attr('height', height + margin.top + margin.bottom)
			.append('g')
			.attr('transform', `translate(${margin.left},${margin.top})`);

		const categories = breakdown.map((d) => PATHWAY_LABELS[d.pathway] || d.pathway);
		const subgroups = ['returned', 'droppedOff', 'newInWeek2'] as const;
		const colors: Record<string, string> = {
			returned: '#33d6a6',
			droppedOff: '#ec3750',
			newInWeek2: '#ff8c37'
		};
		const legendLabels: Record<string, string> = {
			returned: 'Returned',
			droppedOff: 'Dropped Off',
			newInWeek2: 'New in Week 2'
		};

		const stackData = breakdown.map((d) => ({
			pathway: PATHWAY_LABELS[d.pathway] || d.pathway,
			returned: d.returned,
			droppedOff: d.droppedOff,
			newInWeek2: d.newInWeek2
		}));

		const x = d3.scaleBand().domain(categories).range([0, width]).padding(0.3);

		const maxVal = d3.max(breakdown, (d) => d.returned + d.droppedOff + d.newInWeek2) || 0;
		const y = d3.scaleLinear().domain([0, maxVal]).nice().range([height, 0]);

		// X axis
		svg
			.append('g')
			.attr('transform', `translate(0,${height})`)
			.call(d3.axisBottom(x))
			.selectAll('text')
			.attr('transform', 'rotate(-25)')
			.style('text-anchor', 'end')
			.style('font-size', '11px')
			.style('fill', '#8492a6');

		// Y axis
		svg
			.append('g')
			.call(d3.axisLeft(y).ticks(5))
			.selectAll('text')
			.style('font-size', '11px')
			.style('fill', '#8492a6');

		// Remove axis lines
		svg.selectAll('.domain').attr('stroke', '#e0e0e0');
		svg.selectAll('.tick line').attr('stroke', '#e0e0e0');

		// Stacked bars
		const stack = d3.stack<(typeof stackData)[number]>().keys(subgroups);
		const series = stack(stackData);

		// Tooltip
		const tooltip = d3
			.select(container)
			.append('div')
			.style('position', 'absolute')
			.style('background', 'rgba(26, 26, 46, 0.9)')
			.style('color', 'white')
			.style('padding', '6px 10px')
			.style('border-radius', '6px')
			.style('font-size', '12px')
			.style('pointer-events', 'none')
			.style('opacity', 0);

		svg
			.selectAll('g.layer')
			.data(series)
			.join('g')
			.attr('class', 'layer')
			.attr('fill', (d) => colors[d.key])
			.selectAll('rect')
			.data((d) => d)
			.join('rect')
			.attr('x', (d) => x(d.data.pathway)!)
			.attr('y', (d) => y(d[1]))
			.attr('height', (d) => y(d[0]) - y(d[1]))
			.attr('width', x.bandwidth())
			.attr('rx', 2)
			.on('mouseenter', function (_event, d) {
				const parentNode = (this as SVGRectElement).parentNode;
				if (!parentNode) return;
				const parentData = d3.select(parentNode as Element).datum() as d3.Series<
					(typeof stackData)[number],
					string
				>;
				const key = parentData.key as keyof typeof legendLabels;
				tooltip
					.html(`<strong>${d.data.pathway}</strong><br/>${legendLabels[key]}: ${d[1] - d[0]}`)
					.style('opacity', 1);
			})
			.on('mousemove', (event) => {
				const rect = container.getBoundingClientRect();
				tooltip
					.style('left', `${event.clientX - rect.left + 12}px`)
					.style('top', `${event.clientY - rect.top - 10}px`);
			})
			.on('mouseleave', () => {
				tooltip.style('opacity', 0);
			});

		// Legend
		const legend = svg
			.append('g')
			.attr('transform', `translate(${width - 200}, -10)`);

		subgroups.forEach((key, i) => {
			const g = legend.append('g').attr('transform', `translate(${i * 90}, 0)`);
			g.append('rect').attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', colors[key]);
			g.append('text')
				.attr('x', 14)
				.attr('y', 9)
				.text(legendLabels[key])
				.style('font-size', '10px')
				.style('fill', '#8492a6');
		});
	}

	$effect(() => {
		fetchData();
	});

	$effect(() => {
		if (data && chartContainer) {
			renderChart(chartContainer, data.pathwayBreakdown);
		}
	});
</script>

<section class="dropoff-section">
	<h2>Week 1 &rarr; Week 2 Drop-Off</h2>

	{#if loading}
		<div class="loading">Loading drop-off data...</div>
	{:else if fetchError}
		<div class="error-msg">{fetchError}</div>
	{:else if data}
		<div class="summary-cards">
			<div class="stat-card">
				<span class="stat-value">{data.week1}</span>
				<span class="stat-label">Week 1 Participants</span>
			</div>
			<div class="stat-card">
				<span class="stat-value">{data.week2}</span>
				<span class="stat-label">Week 2 Participants</span>
			</div>
			<div class="stat-card">
				<span class="stat-value returned">{data.returned}</span>
				<span class="stat-label">Returned</span>
			</div>
			<div class="stat-card">
				<span class="stat-value dropped">{data.droppedOff}</span>
				<span class="stat-label">Dropped Off</span>
			</div>
			<div class="stat-card">
				<span class="stat-value new-users">{data.newInWeek2}</span>
				<span class="stat-label">New in Week 2</span>
			</div>
			<div class="stat-card highlight">
				<span class="stat-value dropped">{data.dropoffPct}%</span>
				<span class="stat-label">Drop-Off Rate</span>
			</div>
		</div>

		<div class="chart-section">
			<h3>Participants by Pathway</h3>
			<div class="chart-container" bind:this={chartContainer}></div>
		</div>

		<div class="breakdown-table-wrapper">
			<h3>Breakdown by Pathway</h3>
			<table class="breakdown-table">
				<thead>
					<tr>
						<th>Pathway</th>
						<th>Week 1</th>
						<th>Week 2</th>
						<th>Returned</th>
						<th>Dropped</th>
						<th>New</th>
						<th>Drop-Off %</th>
					</tr>
				</thead>
				<tbody>
					{#each data.pathwayBreakdown as row (row.pathway)}
						<tr>
							<td class="pathway-name">{PATHWAY_LABELS[row.pathway] || row.pathway}</td>
							<td>{row.week1}</td>
							<td>{row.week2}</td>
							<td class="returned">{row.returned}</td>
							<td class="dropped">{row.droppedOff}</td>
							<td class="new-users">{row.newInWeek2}</td>
							<td class="dropped">{row.dropoffPct}%</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

<style>
	.dropoff-section {
		background: rgba(255, 255, 255, 0.85);
		border: 1px solid #af98ff;
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	h2 {
		font-size: 1.25rem;
		margin: 0 0 1rem;
		color: #1a1a2e;
	}

	h3 {
		font-size: 1rem;
		margin: 0 0 0.75rem;
		color: #1a1a2e;
	}

	.loading,
	.error-msg {
		text-align: center;
		padding: 2rem;
		color: #8492a6;
		font-size: 0.875rem;
	}

	.error-msg {
		color: #ec3750;
	}

	.summary-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.stat-card {
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.stat-card.highlight {
		border-color: #ec3750;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: #338eda;
	}

	.stat-value.returned {
		color: #33d6a6;
	}

	.stat-value.dropped {
		color: #ec3750;
	}

	.stat-value.new-users {
		color: #ff8c37;
	}

	.stat-label {
		font-size: 0.75rem;
		color: #8492a6;
		margin-top: 0.25rem;
	}

	.chart-section {
		margin-bottom: 1.5rem;
	}

	.chart-container {
		position: relative;
		width: 100%;
		min-height: 300px;
	}

	.breakdown-table-wrapper {
		overflow-x: auto;
	}

	.breakdown-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.breakdown-table th,
	.breakdown-table td {
		text-align: left;
		padding: 0.625rem 0.75rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.breakdown-table th {
		font-weight: 600;
		color: #8492a6;
		white-space: nowrap;
	}

	.pathway-name {
		font-weight: 500;
	}

	td.returned {
		color: #33d6a6;
		font-weight: 600;
	}

	td.dropped {
		color: #ec3750;
		font-weight: 600;
	}

	td.new-users {
		color: #ff8c37;
		font-weight: 600;
	}
</style>
