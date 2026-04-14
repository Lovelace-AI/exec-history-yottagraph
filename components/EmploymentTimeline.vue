<template>
    <div>
        <div class="d-flex align-center mb-4">
            <v-icon color="primary" class="mr-2">mdi-timeline-clock</v-icon>
            <span class="text-subtitle-1 font-weight-medium">Employment History</span>
        </div>

        <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

        <div v-if="spans.length" class="timeline-container">
            <div
                v-for="(span, i) in spans"
                :key="span.orgNeid"
                class="timeline-row d-flex align-center mb-3"
            >
                <div class="org-label text-body-2 text-truncate" :title="span.orgName">
                    {{ span.orgName }}
                </div>
                <div class="bar-container flex-grow-1 mx-3">
                    <div
                        class="timeline-bar"
                        :style="{ backgroundColor: barColors[i % barColors.length] }"
                    />
                </div>
                <div class="role-chip">
                    <v-chip size="x-small" variant="tonal" :color="barColors[i % barColors.length]">
                        {{ formatRoles(span.roles) }}
                    </v-chip>
                </div>
            </div>
        </div>

        <v-empty-state
            v-else-if="!loading && personName"
            icon="mdi-briefcase-off"
            headline="No employment data"
            :text="`No linked organizations found for ${personName}`"
            size="small"
        />
    </div>
</template>

<script setup lang="ts">
    import type { EmploymentSpan } from '~/composables/useExecutiveData';

    defineProps<{
        spans: EmploymentSpan[];
        loading: boolean;
        personName?: string;
    }>();

    const barColors = ['#3fea00', '#003bff', '#ff5c00', '#00d4ff', '#ff3d71', '#ffaa00', '#8b5cf6'];

    const ROLE_LABELS: Record<string, string> = {
        is_officer: 'Officer',
        is_director: 'Director',
        works_at: 'Employee',
        head_of: 'Head',
        employed_by: 'Employee',
    };

    function formatRoles(roles: string[]): string {
        if (!roles.length) return 'Role';
        const labels = roles.map((r) => ROLE_LABELS[r] || r).filter(Boolean);
        const unique = [...new Set(labels)];
        return unique.slice(0, 2).join(', ') || 'Role';
    }
</script>

<style scoped>
    .timeline-container {
        padding: 4px 0;
    }

    .org-label {
        width: 180px;
        min-width: 180px;
        text-align: right;
        padding-right: 4px;
    }

    .bar-container {
        height: 28px;
        position: relative;
        border-radius: 6px;
        overflow: hidden;
    }

    .timeline-bar {
        height: 100%;
        width: 100%;
        border-radius: 6px;
        opacity: 0.85;
    }

    .role-chip {
        min-width: 90px;
    }
</style>
