<template>
    <div>
        <div class="d-flex align-center mb-3">
            <v-icon class="mr-2" color="primary" size="20">mdi-chart-line</v-icon>
            <span class="text-subtitle-1 font-weight-medium">Company Metrics During Tenure</span>
            <v-spacer />
            <v-select
                v-model="selectedMetric"
                :items="METRIC_OPTIONS"
                item-title="label"
                item-value="value"
                variant="outlined"
                density="compact"
                hide-details
                style="max-width: 200px"
            />
        </div>

        <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-2" />

        <div v-if="!loading && hasData" class="chart-container">
            <canvas ref="chartCanvas" />
        </div>

        <v-empty-state
            v-if="!loading && !hasData && tenures.length > 0"
            :headline="`No ${selectedMetricLabel} data`"
            text="Financial data not available for these companies during the selected period"
            icon="mdi-chart-line-variant"
            density="compact"
        />
    </div>
</template>

<script setup lang="ts">
    import { Chart, registerables } from 'chart.js';
    import type { TenureRecord, FinancialDataPoint } from '~/composables/useExecutiveHistory';
    import { METRIC_OPTIONS } from '~/composables/useExecutiveHistory';

    Chart.register(...registerables);

    type MetricKey =
        | 'total_revenue'
        | 'net_income'
        | 'total_assets'
        | 'total_liabilities'
        | 'shares_outstanding';

    const props = defineProps<{
        tenures: TenureRecord[];
        loading: boolean;
        metricsData: Map<string, FinancialDataPoint[]>;
    }>();

    const BAR_COLORS = [
        '#3fea00',
        '#003bff',
        '#ff5c00',
        '#a855f7',
        '#14b8a6',
        '#f59e0b',
        '#ef4444',
        '#ec4899',
    ];

    const chartCanvas = ref<HTMLCanvasElement | null>(null);
    let chart: Chart | null = null;

    const selectedMetric = defineModel<MetricKey>('metric', { default: 'total_revenue' });

    const selectedMetricLabel = computed(() => {
        return METRIC_OPTIONS.find((o) => o.value === selectedMetric.value)?.label ?? '';
    });

    const hasData = computed(() => {
        for (const [, points] of props.metricsData) {
            if (points.length > 0) return true;
        }
        return false;
    });

    function buildChart() {
        if (!chartCanvas.value) return;
        if (chart) chart.destroy();

        const datasets = props.tenures
            .map((tenure, i) => {
                const points = props.metricsData.get(tenure.orgNeid) ?? [];
                const filtered = points.filter((p) => {
                    if (!tenure.earliestFiling || !tenure.latestFiling) return true;
                    return p.date >= tenure.earliestFiling && p.date <= tenure.latestFiling;
                });

                if (!filtered.length) return null;

                return {
                    label: tenure.orgName + (tenure.ticker ? ` (${tenure.ticker})` : ''),
                    data: filtered.map((p) => ({ x: p.date, y: p.value })),
                    borderColor: BAR_COLORS[i % BAR_COLORS.length],
                    backgroundColor: BAR_COLORS[i % BAR_COLORS.length] + '33',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                };
            })
            .filter(Boolean) as any[];

        if (!datasets.length) return;

        chart = new Chart(chartCanvas.value, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'nearest',
                    intersect: false,
                },
                scales: {
                    x: {
                        type: 'category',
                        ticks: { color: '#999', maxRotation: 45 },
                        grid: { color: 'rgba(255,255,255,0.05)' },
                    },
                    y: {
                        ticks: {
                            color: '#999',
                            callback: (val: any) => formatLargeNumber(Number(val)),
                        },
                        grid: { color: 'rgba(255,255,255,0.05)' },
                    },
                },
                plugins: {
                    legend: {
                        labels: { color: '#e5e5e5', usePointStyle: true },
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx: any) => {
                                const label = ctx.dataset.label || '';
                                const val = formatLargeNumber(ctx.parsed.y);
                                return `${label}: ${val}`;
                            },
                        },
                    },
                },
            },
        });
    }

    watch(
        () => [props.metricsData, props.tenures, props.loading],
        () => {
            if (!props.loading) {
                nextTick(() => buildChart());
            }
        },
        { deep: true }
    );

    onMounted(() => {
        if (!props.loading && hasData.value) {
            nextTick(() => buildChart());
        }
    });

    onUnmounted(() => chart?.destroy());

    function formatLargeNumber(n: number): string {
        const abs = Math.abs(n);
        if (abs >= 1e12) return (n / 1e12).toFixed(1) + 'T';
        if (abs >= 1e9) return (n / 1e9).toFixed(1) + 'B';
        if (abs >= 1e6) return (n / 1e6).toFixed(1) + 'M';
        if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
        return n.toLocaleString();
    }
</script>

<style scoped>
    .chart-container {
        position: relative;
        height: 350px;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 8px;
        padding: 16px;
    }
</style>
