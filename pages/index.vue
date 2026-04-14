<template>
    <div class="d-flex flex-column fill-height">
        <div class="flex-shrink-0 pa-4 pb-0">
            <div class="d-flex align-center mb-4">
                <v-icon size="28" color="primary" class="mr-3">mdi-account-tie</v-icon>
                <div>
                    <h1 class="text-h5 font-weight-medium">Executive History</h1>
                    <p class="text-body-2 text-medium-emphasis mb-0">
                        Track executive tenure and company performance
                    </p>
                </div>
            </div>

            <CompanySearch @selected="onCompanySelected" />
        </div>

        <div class="flex-grow-1 overflow-y-auto pa-4">
            <template v-if="selectedCompany">
                <v-card class="mb-4 pa-4">
                    <div class="d-flex align-center mb-1">
                        <v-icon size="18" class="mr-2">mdi-domain</v-icon>
                        <span class="text-h6">{{ selectedCompany.name }}</span>
                    </div>
                </v-card>

                <v-card class="mb-4 pa-4">
                    <OfficerList
                        :officers="officers"
                        :loading="officersLoading"
                        :error="officersError"
                        :selected-neid="selectedOfficer?.neid ?? null"
                        @select="onOfficerSelected"
                    />
                </v-card>

                <template v-if="selectedOfficer">
                    <v-card class="mb-4 pa-4">
                        <div class="d-flex align-center mb-3">
                            <v-icon size="20" class="mr-2" color="primary">mdi-account</v-icon>
                            <span class="text-subtitle-1 font-weight-medium">{{
                                selectedOfficer.name
                            }}</span>
                            <v-chip class="ml-2" color="primary" size="small">
                                {{ selectedOfficer.jobTitle }}
                            </v-chip>
                        </div>

                        <TenureTimeline
                            :tenures="tenures"
                            :loading="tenureLoading"
                            :error="tenureError"
                        />
                    </v-card>

                    <v-card v-if="tenures.length > 0" class="mb-4 pa-4">
                        <MetricOverlay
                            v-model:metric="selectedMetric"
                            :tenures="tenures"
                            :loading="metricsLoading"
                            :metrics-data="metricsData"
                        />
                    </v-card>
                </template>
            </template>

            <div v-else class="d-flex justify-center align-center" style="min-height: 300px">
                <div class="text-center">
                    <v-icon size="64" color="primary" class="mb-4" style="opacity: 0.3">
                        mdi-account-search
                    </v-icon>
                    <h2 class="text-h6 text-medium-emphasis mb-2">Search for a company to begin</h2>
                    <p class="text-body-2 text-medium-emphasis" style="max-width: 400px">
                        Enter a company name above to explore its executives, their employment
                        history, and how company metrics changed during their tenure.
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import type {
        Officer,
        TenureRecord,
        FinancialDataPoint,
    } from '~/composables/useExecutiveHistory';

    type MetricKey =
        | 'total_revenue'
        | 'net_income'
        | 'total_assets'
        | 'total_liabilities'
        | 'shares_outstanding';

    const { getOfficers, getEmploymentTimeline, getFinancialMetrics } = useExecutiveHistory();

    const selectedCompany = ref<{ neid: string; name: string } | null>(null);
    const officers = ref<Officer[]>([]);
    const officersLoading = ref(false);
    const officersError = ref<string | null>(null);

    const selectedOfficer = ref<Officer | null>(null);
    const tenures = ref<TenureRecord[]>([]);
    const tenureLoading = ref(false);
    const tenureError = ref<string | null>(null);

    const selectedMetric = ref<MetricKey>('total_revenue');
    const metricsData = ref<Map<string, FinancialDataPoint[]>>(new Map());
    const metricsLoading = ref(false);

    async function onCompanySelected(company: { neid: string; name: string }) {
        selectedCompany.value = company;
        selectedOfficer.value = null;
        tenures.value = [];
        metricsData.value = new Map();

        officersLoading.value = true;
        officersError.value = null;
        try {
            officers.value = await getOfficers(company.neid);
        } catch (e: any) {
            officersError.value = e.message || 'Failed to load officers';
            officers.value = [];
        } finally {
            officersLoading.value = false;
        }
    }

    async function onOfficerSelected(officer: Officer) {
        selectedOfficer.value = officer;
        metricsData.value = new Map();

        tenureLoading.value = true;
        tenureError.value = null;
        try {
            tenures.value = await getEmploymentTimeline(officer.neid);
        } catch (e: any) {
            tenureError.value = e.message || 'Failed to load employment history';
            tenures.value = [];
        } finally {
            tenureLoading.value = false;
        }

        if (tenures.value.length) {
            loadMetrics();
        }
    }

    async function loadMetrics() {
        const orgNeids = tenures.value.map((t) => t.orgNeid);
        if (!orgNeids.length) return;

        metricsLoading.value = true;
        try {
            metricsData.value = await getFinancialMetrics(orgNeids, selectedMetric.value);
        } catch {
            metricsData.value = new Map();
        } finally {
            metricsLoading.value = false;
        }
    }

    watch(selectedMetric, () => {
        if (tenures.value.length) {
            loadMetrics();
        }
    });
</script>
