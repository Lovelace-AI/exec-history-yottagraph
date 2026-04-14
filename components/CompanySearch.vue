<template>
    <v-autocomplete
        v-model="selected"
        v-model:search="searchQuery"
        :items="suggestions"
        :loading="searching"
        item-title="name"
        item-value="neid"
        return-object
        label="Search for a company"
        prepend-inner-icon="mdi-domain"
        variant="solo-filled"
        rounded="lg"
        hide-no-data
        no-filter
        clearable
        density="comfortable"
        class="company-search"
        @update:model-value="onSelect"
    >
        <template #item="{ props: itemProps, item }">
            <v-list-item v-bind="itemProps">
                <template #subtitle>
                    <span class="text-medium-emphasis text-caption">{{ item.raw.neid }}</span>
                </template>
            </v-list-item>
        </template>
    </v-autocomplete>
</template>

<script setup lang="ts">
    const emit = defineEmits<{
        selected: [company: { neid: string; name: string }];
    }>();

    const { searchCompanies } = useExecutiveHistory();

    const selected = ref<{ neid: string; name: string } | null>(null);
    const searchQuery = ref('');
    const suggestions = ref<{ neid: string; name: string }[]>([]);
    const searching = ref(false);

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    watch(searchQuery, (val) => {
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
            suggestions.value = await searchCompanies(query);
        } catch {
            suggestions.value = [];
        } finally {
            searching.value = false;
        }
    }

    function onSelect(item: { neid: string; name: string } | null) {
        if (item) {
            emit('selected', item);
        }
    }
</script>

<style scoped>
    .company-search {
        max-width: 600px;
    }
</style>
