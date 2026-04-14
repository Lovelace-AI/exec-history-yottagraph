<template>
    <div class="d-flex flex-column fill-height">
        <!-- Hero / search area -->
        <div class="flex-shrink-0 pa-6">
            <div class="text-center mb-6" v-if="!exec.selectedCompany.value">
                <h1 class="text-h4 font-weight-bold mb-2">
                    <v-icon color="primary" size="36" class="mr-2">mdi-account-clock</v-icon>
                    Exec History
                </h1>
                <p class="text-body-1 text-medium-emphasis">
                    Track executive tenure across companies and see how it connects to company
                    performance
                </p>
            </div>

            <div class="d-flex justify-center">
                <CompanySearch @select="onCompanySelect" />
            </div>
        </div>

        <!-- Error alert -->
        <v-alert v-if="exec.error.value" type="error" variant="tonal" closable class="mx-6 mb-4">
            {{ exec.error.value }}
        </v-alert>

        <!-- Main content -->
        <div v-if="exec.selectedCompany.value" class="flex-grow-1 overflow-y-auto px-6 pb-6">
            <!-- Company header -->
            <div class="d-flex align-center mb-6">
                <v-icon color="primary" size="28" class="mr-3">mdi-office-building</v-icon>
                <div>
                    <h2 class="text-h5 font-weight-bold">
                        {{ exec.selectedCompany.value.name }}
                    </h2>
                    <span class="text-caption text-medium-emphasis">
                        Select an officer to explore their career history
                    </span>
                </div>
                <v-spacer />
                <v-btn variant="text" icon @click="exec.reset()">
                    <v-icon>mdi-close</v-icon>
                </v-btn>
            </div>

            <v-row>
                <!-- Left column: officer list -->
                <v-col cols="12" md="4">
                    <v-card class="pa-4" variant="outlined">
                        <OfficerList
                            :officers="exec.officers.value"
                            :loading="exec.loadingOfficers.value"
                            :selected-neid="exec.selectedOfficer.value?.neid"
                            @select="onOfficerSelect"
                        />
                    </v-card>
                </v-col>

                <!-- Right column: timeline + chart -->
                <v-col cols="12" md="8">
                    <!-- Selected officer info -->
                    <div v-if="exec.selectedOfficer.value" class="mb-6">
                        <v-card class="pa-4 mb-4" variant="outlined">
                            <div class="d-flex align-center mb-1">
                                <v-avatar size="36" color="primary" class="mr-3">
                                    <v-icon color="white">mdi-account</v-icon>
                                </v-avatar>
                                <div>
                                    <h3 class="text-h6 font-weight-bold">
                                        {{ exec.selectedOfficer.value.name }}
                                    </h3>
                                    <span class="text-body-2 text-medium-emphasis">
                                        {{ exec.selectedOfficer.value.title }}
                                    </span>
                                </div>
                            </div>
                        </v-card>

                        <!-- Employment Timeline -->
                        <v-card class="pa-4 mb-4" variant="outlined">
                            <EmploymentTimeline
                                :spans="exec.employmentHistory.value"
                                :loading="exec.loadingEmployment.value"
                                :person-name="exec.selectedOfficer.value?.name"
                            />
                        </v-card>

                        <!-- Metric Overlay -->
                        <v-card
                            v-if="exec.employmentHistory.value.length > 0"
                            class="pa-4"
                            variant="outlined"
                        >
                            <MetricOverlay
                                :metric-data="exec.metricData.value"
                                :spans="exec.employmentHistory.value"
                                :selected-metric="exec.selectedMetric.value"
                                :metric-labels="exec.metricLabels"
                                :loading="exec.loadingMetric.value"
                                @update:metric="onMetricChange"
                            />
                        </v-card>
                    </div>

                    <!-- Placeholder when no officer selected -->
                    <v-card
                        v-else
                        class="pa-8 d-flex align-center justify-center"
                        variant="outlined"
                        min-height="300"
                    >
                        <v-empty-state
                            icon="mdi-account-search"
                            headline="Select an officer"
                            text="Choose an officer or director from the list to explore their career history and company performance data"
                        />
                    </v-card>
                </v-col>
            </v-row>
        </div>

        <!-- Landing state -->
        <div v-else class="flex-grow-1 d-flex align-center justify-center">
            <div class="text-center" style="max-width: 500px">
                <v-icon size="80" color="primary" class="mb-4" style="opacity: 0.3">
                    mdi-chart-timeline-variant-shimmer
                </v-icon>
                <h3 class="text-h6 text-medium-emphasis mb-2">How it works</h3>
                <div class="text-body-2 text-medium-emphasis">
                    <div class="mb-3 d-flex align-start ga-3">
                        <v-chip size="small" color="primary" variant="flat">1</v-chip>
                        <span>Search for a company to see its officers and directors</span>
                    </div>
                    <div class="mb-3 d-flex align-start ga-3">
                        <v-chip size="small" color="primary" variant="flat">2</v-chip>
                        <span>Select an executive to view their employment history</span>
                    </div>
                    <div class="d-flex align-start ga-3">
                        <v-chip size="small" color="primary" variant="flat">3</v-chip>
                        <span>
                            Overlay company metrics like stock price or revenue to see performance
                            during their tenure
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    import type { CompanyMatch, Officer, MetricType } from '~/composables/useExecutiveData';

    const exec = useExecutiveData();

    function onCompanySelect(company: CompanyMatch) {
        exec.selectCompany(company);
    }

    function onOfficerSelect(officer: Officer) {
        exec.selectOfficer(officer);
    }

    function onMetricChange(metric: MetricType) {
        exec.fetchMetricForHistory(metric);
    }
</script>
