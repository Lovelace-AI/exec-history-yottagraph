<template>
    <div>
        <div class="d-flex align-center mb-3">
            <v-icon class="mr-2" color="primary" size="20">mdi-timeline-clock</v-icon>
            <span class="text-subtitle-1 font-weight-medium">Employment Timeline</span>
        </div>

        <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-2" />

        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-2" closable>
            {{ error }}
        </v-alert>

        <div v-if="!loading && tenures.length" class="timeline-container">
            <div v-for="(tenure, i) in tenures" :key="tenure.orgNeid" class="tenure-row">
                <div class="tenure-label">
                    <div class="text-body-2 font-weight-medium text-truncate">
                        {{ tenure.orgName }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                        {{ tenure.ticker ? `(${tenure.ticker})` : '' }}
                        {{ tenure.jobTitle }}
                    </div>
                </div>
                <div class="tenure-bar-container">
                    <div
                        class="tenure-bar"
                        :style="barStyle(tenure, i)"
                        :title="`${tenure.earliestFiling} — ${tenure.latestFiling}`"
                    >
                        <span class="tenure-bar-label text-caption">
                            {{ formatDateShort(tenure.earliestFiling) }} —
                            {{ formatDateShort(tenure.latestFiling) }}
                        </span>
                    </div>
                </div>
            </div>

            <div class="timeline-axis">
                <span
                    v-for="label in axisLabels"
                    :key="label.pos"
                    class="axis-tick"
                    :style="{ left: label.pos + '%' }"
                >
                    {{ label.text }}
                </span>
            </div>
        </div>

        <v-empty-state
            v-if="!loading && !error && !tenures.length"
            headline="No employment records"
            text="This person has no linked company filing records"
            icon="mdi-briefcase-off"
            density="compact"
        />
    </div>
</template>

<script setup lang="ts">
    import type { TenureRecord } from '~/composables/useExecutiveHistory';

    const props = defineProps<{
        tenures: TenureRecord[];
        loading: boolean;
        error: string | null;
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

    const timeRange = computed(() => {
        if (!props.tenures.length) return { min: 0, max: 0 };
        const dates = props.tenures.flatMap((t) =>
            [t.earliestFiling, t.latestFiling].filter(Boolean)
        );
        if (!dates.length) return { min: 0, max: 0 };
        const timestamps = dates.map((d) => new Date(d).getTime());
        const min = Math.min(...timestamps);
        const max = Math.max(...timestamps);
        const padding = (max - min) * 0.05 || 86400000 * 30;
        return { min: min - padding, max: max + padding };
    });

    const axisLabels = computed(() => {
        const { min, max } = timeRange.value;
        if (!min || !max) return [];
        const range = max - min;
        const yearMs = 365.25 * 86400000;
        const startYear = new Date(min).getFullYear();
        const endYear = new Date(max).getFullYear();
        const labels: { pos: number; text: string }[] = [];
        for (let y = startYear; y <= endYear + 1; y++) {
            const ts = new Date(y, 0, 1).getTime();
            if (ts >= min && ts <= max) {
                const pos = ((ts - min) / range) * 100;
                labels.push({ pos, text: String(y) });
            }
        }
        if (labels.length > 10) {
            const step = Math.ceil(labels.length / 8);
            return labels.filter((_, i) => i % step === 0);
        }
        return labels;
    });

    function barStyle(tenure: TenureRecord, index: number) {
        const { min, max } = timeRange.value;
        if (!min || !max) return {};
        const range = max - min;
        const start = tenure.earliestFiling ? new Date(tenure.earliestFiling).getTime() : min;
        const end = tenure.latestFiling ? new Date(tenure.latestFiling).getTime() : max;
        const left = ((start - min) / range) * 100;
        const width = Math.max(((end - start) / range) * 100, 1);
        return {
            left: `${left}%`,
            width: `${width}%`,
            backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
        };
    }

    function formatDateShort(date: string): string {
        if (!date) return '?';
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
</script>

<style scoped>
    .timeline-container {
        position: relative;
        padding-bottom: 32px;
    }

    .tenure-row {
        display: flex;
        align-items: center;
        margin-bottom: 12px;
    }

    .tenure-label {
        flex-shrink: 0;
        width: 180px;
        padding-right: 12px;
    }

    .tenure-bar-container {
        flex-grow: 1;
        position: relative;
        height: 32px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 4px;
    }

    .tenure-bar {
        position: absolute;
        top: 2px;
        height: 28px;
        border-radius: 4px;
        opacity: 0.85;
        display: flex;
        align-items: center;
        padding: 0 8px;
        min-width: 20px;
        transition: opacity 0.2s;
    }

    .tenure-bar:hover {
        opacity: 1;
    }

    .tenure-bar-label {
        color: rgba(0, 0, 0, 0.8);
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .timeline-axis {
        position: relative;
        height: 20px;
        margin-left: 180px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .axis-tick {
        position: absolute;
        top: 4px;
        transform: translateX(-50%);
        font-size: 0.7rem;
        color: var(--lv-silver, #999);
    }
</style>
