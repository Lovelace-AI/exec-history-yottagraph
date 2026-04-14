# exec history

## Vision

This is an app that shows the tenure of different executives at companies, and how it is connect to company attributes like stock price, revenue, etc.

To begin the interaction, a user enters a company name. From the company name, they get a list of offices (CEO, President, etc), and they the user can choose one to focus on.

Now we have the name of the officer, we can track their employment history. We see a timeline showing where this person has worked. Each company of employment is a bar of a different color, stretching across the time the person worked there.

Next we can start connecting their tenure at different companies to the attributes of the company. There's a drop down menu allowing us to select stock price, revenue, liabilities, etc. We see the information about that property of the company, but only for the time the officer was at the company.

So for example if Mr. Smith was President of Company A from March 2020-June 2023, and then was CEO of Company B from July 2023-February 2025, and we select stock price, then we see the stock price of Company A March 2020-June 2023, and the stock price of Company B from July 2023-February 2025. All of this is displayed on an easy to read unified timeline.

## Status

Initial build complete. Core features implemented:

- **Company search** — autocomplete search for organizations via the Elemental API
- **Officer list** — displays officers and directors linked to the selected company, sorted by role seniority (CEO first, then President, CFO, etc.)
- **Employment timeline** — horizontal bar visualization showing each company the selected person has worked at, with color-coded bars spanning from earliest to latest SEC filing date
- **Financial metric overlay** — Chart.js line chart showing company financial metrics (revenue, net income, total assets, total liabilities, shares outstanding) during the executive's tenure at each company, using data from 10-K/10-Q filings

### Data sources used

- **EDGAR** — officer/director relationships (Form 3/4), job titles, filing dates for tenure estimation, financial data from 10-K/10-Q filings
- **Entity search** — `POST /entities/search` for company name resolution
- **Linked expressions** — `POST /elemental/find` with `linked` type for person↔organization graph traversal
- **Property values** — `POST /elemental/entities/properties` for names, titles, filing dates, financial metrics

### Known limitations

- Tenure dates are approximated from SEC filing dates (earliest/latest Form 4 filing for a person-company pair), not exact employment start/end dates
- Financial metrics are per-filing (10-K annual, 10-Q quarterly), not continuous time series
- Stock price overlay not yet implemented (large PID integers for stock properties need special handling)

## Modules

### Company Search (`components/CompanySearch.vue`)

Autocomplete search with debounced API calls to `POST /entities/search`, filtered to organizations.

### Officer List (`components/OfficerList.vue`)

Grid of officer/director cards with name and job title. Sorted by role priority. Clicking selects an officer to explore.

### Tenure Timeline (`components/TenureTimeline.vue`)

CSS-based horizontal bar chart showing employment history. Each company is a different color bar positioned on a shared time axis derived from filing dates.

### Metric Overlay (`components/MetricOverlay.vue`)

Chart.js line chart with a metric selector dropdown. Loads financial data from filing documents and filters to each company's tenure window.

### Data Composable (`composables/useExecutiveHistory.ts`)

All Elemental API data-fetching logic: company search, officer lookup via graph traversal, employment timeline construction from filing references, and financial metric retrieval from filing documents.
