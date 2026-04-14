<template>
    <div>
        <div class="d-flex align-center mb-3">
            <v-icon color="primary" class="mr-2">mdi-account-group</v-icon>
            <span class="text-subtitle-1 font-weight-medium">Officers & Directors</span>
            <v-chip v-if="officers.length" size="small" class="ml-2" variant="tonal">
                {{ officers.length }}
            </v-chip>
        </div>

        <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-2" />

        <v-text-field
            v-if="officers.length > 5"
            v-model="filterText"
            label="Filter by name..."
            prepend-inner-icon="mdi-filter-outline"
            variant="outlined"
            density="compact"
            class="mb-2"
            clearable
            hide-details
        />

        <v-list
            v-if="filteredOfficers.length"
            density="compact"
            nav
            class="officer-list"
            bg-color="transparent"
        >
            <v-list-item
                v-for="officer in filteredOfficers"
                :key="officer.neid"
                :active="selectedNeid === officer.neid"
                @click="$emit('select', officer)"
                rounded="lg"
            >
                <template #prepend>
                    <v-avatar size="32" color="surface-variant">
                        <v-icon size="18">mdi-account</v-icon>
                    </v-avatar>
                </template>
                <v-list-item-title class="text-body-2">{{ officer.name }}</v-list-item-title>
                <v-list-item-subtitle class="text-caption">
                    {{ officer.title }}
                </v-list-item-subtitle>
            </v-list-item>
        </v-list>

        <v-empty-state
            v-else-if="!loading && officers.length === 0"
            icon="mdi-account-off"
            headline="No officers found"
            text="Select a company to see its officers and directors"
            size="small"
        />
    </div>
</template>

<script setup lang="ts">
    import type { Officer } from '~/composables/useExecutiveData';

    const props = defineProps<{
        officers: Officer[];
        loading: boolean;
        selectedNeid?: string;
    }>();

    defineEmits<{
        select: [officer: Officer];
    }>();

    const filterText = ref('');

    const filteredOfficers = computed(() => {
        if (!filterText.value) return props.officers;
        const q = filterText.value.toLowerCase();
        return props.officers.filter(
            (o) => o.name.toLowerCase().includes(q) || o.title.toLowerCase().includes(q)
        );
    });
</script>

<style scoped>
    .officer-list {
        max-height: 500px;
        overflow-y: auto;
    }
</style>
