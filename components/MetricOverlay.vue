<template>
    <div>
        <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
            <div class="d-flex align-center">
                <v-icon color="primary" class="mr-2">mdi-chart-line</v-icon>
                <span class="text-subtitle-1 font-weight-medium">Company Metrics</span>
            </div>
            <v-btn-toggle
                :model-value="selectedMetric"
                mandatory
                density="compact"
                variant="outlined"
                divided
                @update:model-value="$emit('update:metric', $event)"
            >
                <v-btn v-for="(label, key) in metricLabels" :key="key" :value="key" size="small">
                    {{ label }}
                </v-btn>
            </v-btn-toggle>
        </div>

        <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

        <div v-if="hasData" ref="chartContainer" class="chart-container" />

        <v-empty-state
            v-else-if="!loading"
            icon="mdi-chart-line-variant"
            headline="No metric data"
            text="Select a metric to view historical data for the executive's companies"
            size="small"
        />
    </div>
</template>

<script setup lang="ts">
    import * as d3 from 'd3';
    import type { MetricPoint, MetricType, EmploymentSpan } from '~/composables/useExecutiveData';

    const props = defineProps<{
        metricData: Map<string, MetricPoint[]>;
        spans: EmploymentSpan[];
        selectedMetric: MetricType;
        metricLabels: Record<MetricType, string>;
        loading: boolean;
    }>();

    defineEmits<{
        'update:metric': [metric: MetricType];
    }>();

    const chartContainer = ref<HTMLElement | null>(null);

    const barColors = ['#3fea00', '#003bff', '#ff5c00', '#00d4ff', '#ff3d71', '#ffaa00', '#8b5cf6'];

    const hasData = computed(() => {
        for (const points of props.metricData.values()) {
            if (points.length > 0) return true;
        }
        return false;
    });

    watch(
        [() => props.metricData, () => props.spans, () => props.selectedMetric, chartContainer],
        () => {
            if (hasData.value && chartContainer.value) {
                nextTick(() => drawChart());
            }
        },
        { deep: true }
    );

    function drawChart() {
        if (!chartContainer.value) return;

        d3.select(chartContainer.value).selectAll('*').remove();

        const margin = { top: 20, right: 30, bottom: 40, left: 70 };
        const width = chartContainer.value.clientWidth - margin.left - margin.right;
        const height = 300 - margin.top - margin.bottom;

        const svg = d3
            .select(chartContainer.value)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const allPoints: { date: Date; value: number; orgNeid: string }[] = [];

        for (const [orgNeid, points] of props.metricData.entries()) {
            for (const p of points) {
                const d = new Date(p.date);
                if (!isNaN(d.getTime())) {
                    allPoints.push({ date: d, value: p.value, orgNeid });
                }
            }
        }

        if (!allPoints.length) return;

        const xExtent = d3.extent(allPoints, (d) => d.date) as [Date, Date];
        const yExtent = d3.extent(allPoints, (d) => d.value) as [number, number];

        const x = d3.scaleTime().domain(xExtent).range([0, width]);

        const yMin = yExtent[0] * 0.95;
        const yMax = yExtent[1] * 1.05;
        const y = d3.scaleLinear().domain([yMin, yMax]).range([height, 0]).nice();

        svg.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x).ticks(6))
            .selectAll('text')
            .style('fill', '#999')
            .style('font-size', '11px');

        svg.append('g')
            .call(
                d3
                    .axisLeft(y)
                    .ticks(5)
                    .tickFormat((d) => formatValue(d as number))
            )
            .selectAll('text')
            .style('fill', '#999')
            .style('font-size', '11px');

        svg.selectAll('.domain').style('stroke', '#333');
        svg.selectAll('.tick line').style('stroke', '#222');

        const orgNeids = [...new Set(allPoints.map((d) => d.orgNeid))];

        for (let idx = 0; idx < orgNeids.length; idx++) {
            const orgNeid = orgNeids[idx];
            const orgPoints = allPoints
                .filter((d) => d.orgNeid === orgNeid)
                .sort((a, b) => a.date.getTime() - b.date.getTime());

            const color = barColors[idx % barColors.length];

            const spanInfo = props.spans.find((s) => s.orgNeid === orgNeid);
            const label = spanInfo?.orgName ?? orgNeid.slice(0, 8);

            const line = d3
                .line<(typeof orgPoints)[0]>()
                .x((d) => x(d.date))
                .y((d) => y(d.value))
                .curve(d3.curveMonotoneX);

            const area = d3
                .area<(typeof orgPoints)[0]>()
                .x((d) => x(d.date))
                .y0(height)
                .y1((d) => y(d.value))
                .curve(d3.curveMonotoneX);

            svg.append('path')
                .datum(orgPoints)
                .attr('fill', color)
                .attr('fill-opacity', 0.08)
                .attr('d', area);

            svg.append('path')
                .datum(orgPoints)
                .attr('fill', 'none')
                .attr('stroke', color)
                .attr('stroke-width', 2)
                .attr('d', line);

            svg.append('text')
                .attr('x', x(orgPoints[orgPoints.length - 1].date) + 4)
                .attr('y', y(orgPoints[orgPoints.length - 1].value))
                .attr('fill', color)
                .attr('font-size', '10px')
                .attr('alignment-baseline', 'middle')
                .text(label.length > 12 ? label.slice(0, 12) + '…' : label);
        }
    }

    function formatValue(val: number): string {
        if (Math.abs(val) >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
        if (Math.abs(val) >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
        if (Math.abs(val) >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
        return `$${val.toFixed(0)}`;
    }
</script>

<style scoped>
    .chart-container {
        width: 100%;
        min-height: 300px;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 8px;
        padding: 8px;
    }
</style>
