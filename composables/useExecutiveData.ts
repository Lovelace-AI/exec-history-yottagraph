import { useElementalClient } from '@yottagraph-app/elemental-api/client';
import {
    buildGatewayUrl,
    getApiKey,
    gatewayHeaders,
    padNeid,
    searchEntities,
    getEntityName,
} from '~/utils/elementalHelpers';

export interface CompanyMatch {
    neid: string;
    name: string;
    score?: number;
}

export interface Officer {
    neid: string;
    name: string;
    title: string;
    roles: string[];
}

export interface EmploymentSpan {
    orgNeid: string;
    orgName: string;
    roles: string[];
    startDate?: string;
    endDate?: string;
}

export interface MetricPoint {
    date: string;
    value: number;
}

export type MetricType =
    | 'stock_price'
    | 'total_revenue'
    | 'net_income'
    | 'total_assets'
    | 'total_liabilities'
    | 'shareholders_equity';

const METRIC_LABELS: Record<MetricType, string> = {
    stock_price: 'Stock Price',
    total_revenue: 'Total Revenue',
    net_income: 'Net Income',
    total_assets: 'Total Assets',
    total_liabilities: 'Total Liabilities',
    shareholders_equity: "Shareholders' Equity",
};

export function useExecutiveData() {
    const client = useElementalClient();
    const { pidByName, refresh: loadSchema } = useElementalSchema();

    const selectedCompany = ref<CompanyMatch | null>(null);
    const officers = ref<Officer[]>([]);
    const selectedOfficer = ref<Officer | null>(null);
    const employmentHistory = ref<EmploymentSpan[]>([]);
    const selectedMetric = ref<MetricType>('stock_price');
    const metricData = ref<Map<string, MetricPoint[]>>(new Map());

    const loadingCompany = ref(false);
    const loadingOfficers = ref(false);
    const loadingEmployment = ref(false);
    const loadingMetric = ref(false);

    const error = ref<string | null>(null);

    async function ensureSchema() {
        await loadSchema();
    }

    async function searchCompanies(query: string): Promise<CompanyMatch[]> {
        if (!query.trim()) return [];
        return searchEntities(query.trim(), {
            maxResults: 8,
            flavors: ['organization'],
        });
    }

    async function selectCompany(company: CompanyMatch) {
        selectedCompany.value = company;
        selectedOfficer.value = null;
        employmentHistory.value = [];
        metricData.value = new Map();
        error.value = null;

        await fetchOfficers(company.neid);
    }

    async function fetchOfficers(orgNeid: string) {
        loadingOfficers.value = true;
        error.value = null;
        try {
            await ensureSchema();

            const url = buildGatewayUrl('elemental/find');
            const personFid = useElementalSchema().flavorByName('person');
            if (!personFid) throw new Error('Person entity type not found in schema');

            const isOfficerPid = pidByName('is_officer');
            const isDirectorPid = pidByName('is_director');
            const headOfPid = pidByName('head_of');
            const worksAtPid = pidByName('works_at');

            const pids = [isOfficerPid, isDirectorPid, headOfPid, worksAtPid].filter(
                (p): p is number => p !== null
            );

            const expression = {
                type: 'and',
                and: [
                    { type: 'is_type', is_type: { fid: personFid } },
                    {
                        type: 'linked',
                        linked: {
                            to_entity: orgNeid,
                            distance: 1,
                            pids,
                            direction: 'outgoing',
                        },
                    },
                ],
            };

            const res = await client.findEntities({
                expression: JSON.stringify(expression),
                limit: 50,
            });

            const neids: string[] = (res as any).eids ?? [];
            if (!neids.length) {
                officers.value = [];
                return;
            }

            const namePid = pidByName('name');
            const jobTitlePid = pidByName('job_title');
            const fetchPids = [namePid, jobTitlePid].filter((p): p is number => p !== null);

            const props = await client.getPropertyValues({
                eids: JSON.stringify(neids),
                pids: JSON.stringify(fetchPids),
            });

            const valueMap = new Map<string, Record<number, any[]>>();
            for (const v of (props as any).values ?? []) {
                const eid = padNeid(v.eid ?? v.entity_id ?? '');
                if (!valueMap.has(eid)) valueMap.set(eid, {});
                const map = valueMap.get(eid)!;
                if (!map[v.pid]) map[v.pid] = [];
                map[v.pid].push(v.value);
            }

            const officerList: Officer[] = [];
            for (const neid of neids) {
                const vals = valueMap.get(neid) ?? {};
                const names = namePid ? (vals[namePid] ?? []) : [];
                const titles = jobTitlePid ? (vals[jobTitlePid] ?? []) : [];
                const displayName = names.length > 0 ? String(names[0]) : neid;
                const title = titles.length > 0 ? String(titles[0]) : 'Officer/Director';

                officerList.push({
                    neid,
                    name: formatName(displayName),
                    title,
                    roles: [],
                });
            }

            officerList.sort((a, b) => a.name.localeCompare(b.name));
            officers.value = officerList;
        } catch (e: any) {
            error.value = e.message || 'Failed to load officers';
            officers.value = [];
        } finally {
            loadingOfficers.value = false;
        }
    }

    function formatName(raw: string): string {
        if (!raw || raw === raw.toUpperCase()) {
            return raw
                .toLowerCase()
                .split(/[\s]+/)
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ');
        }
        return raw;
    }

    async function selectOfficer(officer: Officer) {
        selectedOfficer.value = officer;
        employmentHistory.value = [];
        metricData.value = new Map();
        error.value = null;
        await fetchEmploymentHistory(officer.neid);
    }

    async function fetchEmploymentHistory(personNeid: string) {
        loadingEmployment.value = true;
        error.value = null;
        try {
            await ensureSchema();
            const worksAtPid = pidByName('works_at');
            const isOfficerPid = pidByName('is_officer');
            const isDirectorPid = pidByName('is_director');
            const headOfPid = pidByName('head_of');
            const employedByPid = pidByName('employed_by');

            const relPids = [
                worksAtPid,
                isOfficerPid,
                isDirectorPid,
                headOfPid,
                employedByPid,
            ].filter((p): p is number => p !== null);

            const props = await client.getPropertyValues({
                eids: JSON.stringify([personNeid]),
                pids: JSON.stringify(relPids),
            });

            const orgNeidsSet = new Set<string>();
            const rolesByOrg = new Map<string, string[]>();

            for (const v of (props as any).values ?? []) {
                const orgNeid = padNeid(v.value);
                orgNeidsSet.add(orgNeid);

                const pidName = useElementalSchema().propertyName(v.pid);
                const roleName = pidName || `pid:${v.pid}`;
                if (!rolesByOrg.has(orgNeid)) rolesByOrg.set(orgNeid, []);
                const roles = rolesByOrg.get(orgNeid)!;
                if (!roles.includes(roleName)) roles.push(roleName);
            }

            const orgNeids = [...orgNeidsSet];
            if (!orgNeids.length) {
                employmentHistory.value = [];
                return;
            }

            const orgNames = await Promise.allSettled(
                orgNeids.map((neid) => getEntityName(neid).catch(() => neid))
            );

            const spans: EmploymentSpan[] = orgNeids.map((neid, i) => {
                const result = orgNames[i];
                const name = result.status === 'fulfilled' ? result.value : neid;
                return {
                    orgNeid: neid,
                    orgName: typeof name === 'string' ? name : neid,
                    roles: rolesByOrg.get(neid) ?? [],
                };
            });

            const validSpans = spans.filter((s) => s.orgName && !s.orgName.match(/^\d{20}$/));

            employmentHistory.value = validSpans;

            if (validSpans.length > 0) {
                await fetchMetricForHistory(selectedMetric.value);
            }
        } catch (e: any) {
            error.value = e.message || 'Failed to load employment history';
            employmentHistory.value = [];
        } finally {
            loadingEmployment.value = false;
        }
    }

    async function fetchMetricForHistory(metric: MetricType) {
        if (!employmentHistory.value.length) return;
        loadingMetric.value = true;
        selectedMetric.value = metric;
        const newData = new Map<string, MetricPoint[]>();

        try {
            await ensureSchema();

            if (metric === 'stock_price') {
                for (const span of employmentHistory.value) {
                    try {
                        const tickerPid = pidByName('ticker');
                        if (!tickerPid) continue;

                        const tickerRes = await client.getPropertyValues({
                            eids: JSON.stringify([span.orgNeid]),
                            pids: JSON.stringify([tickerPid]),
                        });

                        const tickers = (tickerRes as any).values ?? [];
                        if (!tickers.length) continue;

                        const ticker = String(tickers[0].value);
                        const url = buildGatewayUrl(
                            `stocks/daily?ticker=${encodeURIComponent(ticker)}&lookback_days=1825`
                        );
                        try {
                            const stockRes = await $fetch<any>(url, {
                                headers: { 'X-Api-Key': getApiKey() },
                            });
                            const prices: MetricPoint[] = (stockRes?.prices ?? []).map(
                                (p: any) => ({
                                    date: p.date,
                                    value: p.close,
                                })
                            );
                            if (prices.length) {
                                newData.set(span.orgNeid, prices);
                            }
                        } catch {
                            // Stock data not available via gateway, skip
                        }
                    } catch {
                        // Skip orgs without stock data
                    }
                }
            } else {
                const propPid = pidByName(metric);
                if (!propPid) {
                    metricData.value = newData;
                    return;
                }

                const orgNeids = employmentHistory.value.map((s) => s.orgNeid);
                const propRes = await client.getPropertyValues({
                    eids: JSON.stringify(orgNeids),
                    pids: JSON.stringify([propPid]),
                });

                for (const v of (propRes as any).values ?? []) {
                    const orgNeid = padNeid(v.eid ?? v.entity_id ?? '');
                    if (!newData.has(orgNeid)) newData.set(orgNeid, []);
                    newData.get(orgNeid)!.push({
                        date: v.timestamp || v.date || '',
                        value: Number(v.value) || 0,
                    });
                }

                for (const [key, points] of newData.entries()) {
                    points.sort((a, b) => a.date.localeCompare(b.date));
                    newData.set(key, points);
                }
            }

            metricData.value = newData;
        } catch (e: any) {
            console.warn('Failed to fetch metric data:', e);
        } finally {
            loadingMetric.value = false;
        }
    }

    function reset() {
        selectedCompany.value = null;
        officers.value = [];
        selectedOfficer.value = null;
        employmentHistory.value = [];
        metricData.value = new Map();
        error.value = null;
    }

    return {
        selectedCompany: readonly(selectedCompany),
        officers: readonly(officers),
        selectedOfficer: readonly(selectedOfficer),
        employmentHistory: readonly(employmentHistory),
        selectedMetric: readonly(selectedMetric),
        metricData: readonly(metricData),
        loadingCompany: readonly(loadingCompany),
        loadingOfficers: readonly(loadingOfficers),
        loadingEmployment: readonly(loadingEmployment),
        loadingMetric: readonly(loadingMetric),
        error: readonly(error),
        metricLabels: METRIC_LABELS,
        searchCompanies,
        selectCompany,
        selectOfficer,
        fetchMetricForHistory,
        reset,
    };
}
