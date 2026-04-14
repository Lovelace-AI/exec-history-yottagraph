<template>
    <div class="company-search" style="position: relative">
        <v-text-field
            v-model="searchQuery"
            label="Search for a company"
            prepend-inner-icon="mdi-domain"
            variant="solo-filled"
            rounded="lg"
            clearable
            density="comfortable"
            :loading="searching"
            @focus="showMenu = suggestions.length > 0"
            @click:clear="onClear"
        />

        <v-card v-if="showMenu && suggestions.length > 0" class="search-dropdown" elevation="8">
            <v-list density="compact">
                <v-list-item
                    v-for="item in suggestions"
                    :key="item.neid"
                    :title="item.name"
                    @click="onSelect(item)"
                >
                    <template #subtitle>
                        <span class="text-medium-emphasis text-caption">{{ item.neid }}</span>
                    </template>
                </v-list-item>
            </v-list>
        </v-card>
    </div>
</template>

<script setup lang="ts">
    const emit = defineEmits<{
        selected: [company: { neid: string; name: string }];
    }>();

    const { searchCompanies } = useExecutiveHistory();

    const searchQuery = ref('');
    const suggestions = ref<{ neid: string; name: string }[]>([]);
    const searching = ref(false);
    const showMenu = ref(false);
    let selectedName = '';

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    watch(searchQuery, (val) => {
        if (debounceTimer) clearTimeout(debounceTimer);

        if (val === selectedName) return;

        if (!val || val.length < 2) {
            suggestions.value = [];
            showMenu.value = false;
            return;
        }
        debounceTimer = setTimeout(() => doSearch(val), 300);
    });

    async function doSearch(query: string) {
        searching.value = true;
        try {
            suggestions.value = await searchCompanies(query);
            showMenu.value = suggestions.value.length > 0;
        } catch {
            suggestions.value = [];
            showMenu.value = false;
        } finally {
            searching.value = false;
        }
    }

    function onSelect(item: { neid: string; name: string }) {
        selectedName = item.name;
        searchQuery.value = item.name;
        suggestions.value = [];
        showMenu.value = false;
        emit('selected', item);
    }

    function onClear() {
        selectedName = '';
        suggestions.value = [];
        showMenu.value = false;
    }

    onMounted(() => {
        document.addEventListener('click', (e) => {
            const el = (e.target as HTMLElement)?.closest('.company-search');
            if (!el) showMenu.value = false;
        });
    });
</script>

<style scoped>
    .company-search {
        max-width: 600px;
    }

    .search-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        z-index: 100;
        max-height: 300px;
        overflow-y: auto;
        margin-top: -8px;
    }
</style>
