/**
 * Data-fetching composable for executive history:
 * company search, officer lookup, employment timeline, and financial metrics.
 */

import { useElementalClient } from '@yottagraph-app/elemental-api/client';
import {
    searchEntities,
    getEntityName,
    buildGatewayUrl,
    getApiKey,
    padNeid,
} from '~/utils/elementalHelpers';

export interface Officer {
    neid: string;
    name: string;
    jobTitle: string;
}

export interface TenureRecord {
    orgNeid: string;
    orgName: string;
    ticker: string | null;
    jobTitle: string;
    earliestFiling: string;
    latestFiling: string;
}

export interface FinancialDataPoint {
    date: string;
    value: number;
    orgNeid: string;
}

type MetricKey =
    | 'total_revenue'
    | 'net_income'
    | 'total_assets'
    | 'total_liabilities'
    | 'shares_outstanding';

const METRIC_PIDS: Record<MetricKey, number> = {
    total_revenue: 181,
    net_income: 182,
    total_assets: 183,
    total_liabilities: 184,
    shares_outstanding: 186,
};

export const METRIC_OPTIONS: { value: MetricKey; label: string }[] = [
    { value: 'total_revenue', label: 'Revenue' },
    { value: 'net_income', label: 'Net Income' },
    { value: 'total_assets', label: 'Total Assets' },
    { value: 'total_liabilities', label: 'Total Liabilities' },
    { value: 'shares_outstanding', label: 'Shares Outstanding' },
];

const PID_NAME = 8;
const PID_JOB_TITLE = 209;
const PID_IS_OFFICER = 188;
const PID_IS_DIRECTOR = 187;
const PID_WORKS_AT = 110;
const PID_FILING_REFERENCE = 232;
const PID_FILING_DATE = 177;
const PID_FORM_TYPE = 179;
const PID_TICKER = 169;
const PID_ISSUED_BY = 200;

const FLAVOR_PERSON = 9;
const FLAVOR_ORG = 10;

export function useExecutiveHistory() {
    const client = useElementalClient();

    const loading = ref(false);
    const error = ref<string | null>(null);

    async function searchCompanies(query: string): Promise<{ neid: string; name: string }[]> {
        return searchEntities(query, {
            maxResults: 8,
            flavors: ['organization'],
            includeNames: true,
        });
    }

    async function getOfficers(orgNeid: string): Promise<Officer[]> {
        const expr = JSON.stringify({
            type: 'and',
            and: [
                {
                    type: 'linked',
                    linked: {
                        to_entity: orgNeid,
                        distance: 1,
                        pids: [PID_IS_OFFICER, PID_IS_DIRECTOR],
                        direction: 'incoming',
                    },
                },
                { type: 'is_type', is_type: { fid: FLAVOR_PERSON } },
            ],
        });

        const res = await client.findEntities({ expression: expr, limit: 50 });
        const eids: string[] = (res as any).eids ?? [];
        if (!eids.length) return [];

        const names = await Promise.all(
            eids.map(async (neid) => {
                try {
                    return await getEntityName(neid);
                } catch {
                    return neid;
                }
            })
        );

        const propRes = await client.getPropertyValues({
            eids: JSON.stringify(eids),
            pids: JSON.stringify([PID_JOB_TITLE]),
        });

        const titleMap = new Map<string, string>();
        for (const v of (propRes as any).values ?? []) {
            const eid = padNeid(v.eid ?? v.entity_id ?? '');
            if (!titleMap.has(eid)) {
                titleMap.set(eid, v.value as string);
            }
        }

        const officers: Officer[] = eids.map((neid, i) => ({
            neid,
            name: formatName(names[i]),
            jobTitle: titleMap.get(neid) ?? 'Unknown',
        }));

        const titlePriority: Record<string, number> = {
            'Chief Executive Officer': 1,
            CEO: 1,
            President: 2,
            'Chief Financial Officer': 3,
            CFO: 3,
            'Chief Operating Officer': 4,
            COO: 4,
            'Chief Technology Officer': 5,
            CTO: 5,
            Director: 10,
        };

        officers.sort((a, b) => {
            const pa = titlePriority[a.jobTitle] ?? 50;
            const pb = titlePriority[b.jobTitle] ?? 50;
            if (pa !== pb) return pa - pb;
            return a.name.localeCompare(b.name);
        });

        return officers;
    }

    async function getEmploymentTimeline(personNeid: string): Promise<TenureRecord[]> {
        const linkedExpr = JSON.stringify({
            type: 'and',
            and: [
                {
                    type: 'linked',
                    linked: {
                        to_entity: personNeid,
                        distance: 1,
                        pids: [PID_WORKS_AT, PID_IS_OFFICER, PID_IS_DIRECTOR],
                        direction: 'both',
                    },
                },
                { type: 'is_type', is_type: { fid: FLAVOR_ORG } },
            ],
        });

        const orgRes = await client.findEntities({
            expression: linkedExpr,
            limit: 30,
        });
        const orgNeids: string[] = (orgRes as any).eids ?? [];
        if (!orgNeids.length) return [];

        const orgNames = await Promise.all(
            orgNeids.map(async (neid) => {
                try {
                    return await getEntityName(neid);
                } catch {
                    return neid;
                }
            })
        );

        const tickerRes = await client.getPropertyValues({
            eids: JSON.stringify(orgNeids),
            pids: JSON.stringify([PID_TICKER]),
        });

        const tickerMap = new Map<string, string>();
        for (const v of (tickerRes as any).values ?? []) {
            const eid = padNeid(v.eid ?? v.entity_id ?? '');
            if (!tickerMap.has(eid)) tickerMap.set(eid, v.value as string);
        }

        const filingRefRes = await client.getPropertyValues({
            eids: JSON.stringify([personNeid]),
            pids: JSON.stringify([PID_FILING_REFERENCE]),
        });

        const filingNeids: string[] = [
            ...new Set(((filingRefRes as any).values ?? []).map((v: any) => padNeid(v.value))),
        ];

        let filingDateMap = new Map<string, { date: string; issuedBy: string; formType: string }>();

        if (filingNeids.length > 0) {
            const batchSize = 50;
            for (let i = 0; i < filingNeids.length; i += batchSize) {
                const batch = filingNeids.slice(i, i + batchSize);
                const filingProps = await client.getPropertyValues({
                    eids: JSON.stringify(batch),
                    pids: JSON.stringify([PID_FILING_DATE, PID_ISSUED_BY, PID_FORM_TYPE]),
                });

                for (const v of (filingProps as any).values ?? []) {
                    const eid = padNeid(v.eid ?? v.entity_id ?? '');
                    if (!filingDateMap.has(eid)) {
                        filingDateMap.set(eid, {
                            date: '',
                            issuedBy: '',
                            formType: '',
                        });
                    }
                    const entry = filingDateMap.get(eid)!;
                    if (v.pid === PID_FILING_DATE && !entry.date) entry.date = v.value as string;
                    if (v.pid === PID_ISSUED_BY && !entry.issuedBy)
                        entry.issuedBy = padNeid(v.value);
                    if (v.pid === PID_FORM_TYPE && !entry.formType)
                        entry.formType = v.value as string;
                }
            }
        }

        const orgFilings = new Map<string, { earliest: string; latest: string; title: string }>();

        for (const [, filing] of filingDateMap) {
            if (!filing.date || !filing.issuedBy) continue;
            const org = filing.issuedBy;
            if (!orgNeids.includes(org)) continue;

            if (!orgFilings.has(org)) {
                orgFilings.set(org, {
                    earliest: filing.date,
                    latest: filing.date,
                    title: '',
                });
            }
            const rec = orgFilings.get(org)!;
            if (filing.date < rec.earliest) rec.earliest = filing.date;
            if (filing.date > rec.latest) rec.latest = filing.date;
        }

        const personTitleRes = await client.getPropertyValues({
            eids: JSON.stringify([personNeid]),
            pids: JSON.stringify([PID_JOB_TITLE]),
        });

        const personTitles: string[] = [
            ...new Set(((personTitleRes as any).values ?? []).map((v: any) => v.value as string)),
        ];
        const primaryTitle = personTitles[0] ?? 'Officer';

        const tenures: TenureRecord[] = orgNeids.map((neid, i) => {
            const filingData = orgFilings.get(neid);
            return {
                orgNeid: neid,
                orgName: orgNames[i],
                ticker: tickerMap.get(neid) ?? null,
                jobTitle: primaryTitle,
                earliestFiling: filingData?.earliest ?? '',
                latestFiling: filingData?.latest ?? '',
            };
        });

        return tenures.filter((t) => t.earliestFiling || t.latestFiling);
    }

    async function getFinancialMetrics(
        orgNeids: string[],
        metric: MetricKey
    ): Promise<Map<string, FinancialDataPoint[]>> {
        const pid = METRIC_PIDS[metric];
        if (!pid) return new Map();

        const filedPid = await getPropertyPid('filed');
        if (!filedPid) return new Map();

        const result = new Map<string, FinancialDataPoint[]>();

        for (const orgNeid of orgNeids) {
            const filingPropRes = await client.getPropertyValues({
                eids: JSON.stringify([orgNeid]),
                pids: JSON.stringify([filedPid]),
            });

            const docNeids: string[] = [
                ...new Set(((filingPropRes as any).values ?? []).map((v: any) => padNeid(v.value))),
            ];

            if (!docNeids.length) continue;

            const batchSize = 50;
            const dataPoints: FinancialDataPoint[] = [];

            for (let i = 0; i < docNeids.length; i += batchSize) {
                const batch = docNeids.slice(i, i + batchSize);
                const docProps = await client.getPropertyValues({
                    eids: JSON.stringify(batch),
                    pids: JSON.stringify([pid, PID_FILING_DATE]),
                });

                const docData = new Map<string, { value?: number; date?: string }>();
                for (const v of (docProps as any).values ?? []) {
                    const eid = padNeid(v.eid ?? v.entity_id ?? '');
                    if (!docData.has(eid)) docData.set(eid, {});
                    const d = docData.get(eid)!;
                    if (v.pid === pid && d.value === undefined) d.value = Number(v.value);
                    if (v.pid === PID_FILING_DATE && !d.date) d.date = v.value as string;
                }

                for (const [, d] of docData) {
                    if (d.value !== undefined && d.date) {
                        dataPoints.push({
                            date: d.date,
                            value: d.value,
                            orgNeid,
                        });
                    }
                }
            }

            dataPoints.sort((a, b) => a.date.localeCompare(b.date));
            result.set(orgNeid, dataPoints);
        }

        return result;
    }

    let _pidCache: Map<string, number> | null = null;

    async function getPropertyPid(name: string): Promise<number | null> {
        if (!_pidCache) {
            const schemaRes = await client.getSchema();
            const properties =
                (schemaRes as any).schema?.properties ?? (schemaRes as any).properties ?? [];
            _pidCache = new Map(properties.map((p: any) => [p.name, p.pid ?? p.pindex]));
        }
        return _pidCache.get(name) ?? null;
    }

    return {
        loading: readonly(loading),
        error: readonly(error),
        searchCompanies,
        getOfficers,
        getEmploymentTimeline,
        getFinancialMetrics,
    };
}

function formatName(raw: string): string {
    if (!raw || raw === '?') return 'Unknown';
    if (raw === raw.toUpperCase() && raw.includes(' ')) {
        return raw
            .toLowerCase()
            .split(' ')
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
    }
    return raw;
}
