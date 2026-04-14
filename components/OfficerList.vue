<template>
    <div>
        <div class="d-flex align-center mb-3">
            <v-icon class="mr-2" color="primary" size="20">mdi-account-group</v-icon>
            <span class="text-subtitle-1 font-weight-medium">Officers &amp; Directors</span>
            <v-chip class="ml-2" size="x-small" variant="tonal">{{ officers.length }}</v-chip>
        </div>

        <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-2" />

        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mb-2" closable>
            {{ error }}
        </v-alert>

        <div v-if="!loading && officers.length" class="officer-grid">
            <v-card
                v-for="officer in officers"
                :key="officer.neid"
                :class="['officer-card', { 'officer-card--active': officer.neid === selectedNeid }]"
                @click="$emit('select', officer)"
            >
                <v-card-text class="pa-3">
                    <div class="text-body-2 font-weight-medium text-truncate">
                        {{ officer.name }}
                    </div>
                    <div class="text-caption text-medium-emphasis text-truncate">
                        {{ officer.jobTitle }}
                    </div>
                </v-card-text>
            </v-card>
        </div>

        <v-empty-state
            v-if="!loading && !error && !officers.length"
            headline="No officers found"
            text="Try searching for another company"
            icon="mdi-account-off"
            density="compact"
        />
    </div>
</template>

<script setup lang="ts">
    import type { Officer } from '~/composables/useExecutiveHistory';

    defineProps<{
        officers: Officer[];
        loading: boolean;
        error: string | null;
        selectedNeid: string | null;
    }>();

    defineEmits<{
        select: [officer: Officer];
    }>();
</script>

<style scoped>
    .officer-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 8px;
    }

    .officer-card {
        cursor: pointer;
        transition:
            border-color 0.2s,
            background-color 0.2s;
    }

    .officer-card:hover {
        border-color: rgba(63, 234, 0, 0.3);
    }

    .officer-card--active {
        border-color: rgb(63, 234, 0) !important;
        background-color: rgba(63, 234, 0, 0.05);
    }
</style>
