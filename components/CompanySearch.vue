<template>
    <v-autocomplete
        v-model="selected"
        v-model:search="searchText"
        :items="suggestions"
        :loading="searching"
        item-title="name"
        item-value="neid"
        return-object
        label="Search for a company..."
        prepend-inner-icon="mdi-domain"
        variant="solo-filled"
        hide-no-data
        no-filter
        clearable
        density="comfortable"
        class="company-search"
        bg-color="surface"
        @update:model-value="onSelect"
    >
        <template #item="{ item, props: itemProps }">
            <v-list-item v-bind="itemProps">
                <template #prepend>
                    <v-icon color="primary" size="small">mdi-office-building</v-icon>
                </template>
            </v-list-item>
        </template>
    </v-autocomplete>
</template>

<script setup lang="ts">
    import type { CompanyMatch } from '~/composables/useExecutiveData';
    import { searchEntities } from '~/utils/elementalHelpers';

    const emit = defineEmits<{
        select: [company: CompanyMatch];
    }>();

    const selected = ref<CompanyMatch | null>(null);
    const searchText = ref('');
    const suggestions = ref<CompanyMatch[]>([]);
    const searching = ref(false);

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    watch(searchText, (val) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        if (!val || val.length < 2) {
            suggestions.value = [];
            return;
        }
        debounceTimer = setTimeout(() => doSearch(val), 300);
    });

    async function doSearch(query: string) {
        searching.value = true;
        try {
            suggestions.value = await searchEntities(query, {
                maxResults: 8,
                flavors: ['organization'],
            });
        } catch {
            suggestions.value = [];
        } finally {
            searching.value = false;
        }
    }

    function onSelect(company: CompanyMatch | null) {
        if (company) {
            emit('select', company);
        }
    }
</script>

<style scoped>
    .company-search {
        max-width: 600px;
    }
</style>
