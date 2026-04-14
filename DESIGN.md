# exec history

## Vision

This is an app that shows the tenure of different executives at companies, and how it is connect to company attributes like stock price, revenue, etc.

To begin the interaction, a user enters a company name. From the company name, they get a list of offices (CEO, President, etc), and they the user can choose one to focus on.

Now we have the name of the officer, we can track their employment history. We see a timeline showing where this person has worked. Each company of employment is a bar of a different color, stretching across the time the person worked there.

Next we can start connecting their tenure at different companies to the attributes of the company. There's a drop down menu allowing us to select stock price, revenue, liabilities, etc. We see the information about that property of the company, but only for the time the officer was at the company.

So for example if Mr. Smith was President of Company A from March 2020-June 2023, and then was CEO of Company B from July 2023-February 2025, and we select stock price, then we see the stock price of Company A March 2020-June 2023, and the stock price of Company B from July 2023-February 2025. All of this is displayed on an easy to read unified timeline.

## Status

Initial app build complete. Core features implemented:

- **Company search**: Autocomplete search for public companies via Elemental API
- **Officer list**: Displays officers and directors for a selected company with filtering
- **Employment timeline**: Shows linked organizations for a selected executive as colored bars
- **Metric overlay**: D3-based chart showing stock prices, revenue, net income, assets, liabilities, and equity across the executive's companies

### Data Notes

- Officer/director relationships come from SEC Forms 3/4 (`is_officer`, `is_director`, `works_at`, `head_of`, `employed_by`)
- Employment tenure dates are not yet available in the knowledge graph; bars show known linked orgs without precise date ranges
- Stock price data uses the MCP `get_daily_stock_prices` endpoint or gateway proxy
- Financial metrics (revenue, net income, etc.) come from XBRL/EDGAR filings via `getPropertyValues`

## Modules

### `composables/useExecutiveData.ts`

Central composable managing app state and data fetching. Handles company search, officer discovery via graph traversal (`linked` expression), employment history via property relationships, and metric data for stock prices and financial fundamentals.

### `components/CompanySearch.vue`

Debounced autocomplete search using `searchEntities()` helper. Filters to organization flavor only.

### `components/OfficerList.vue`

Filterable list of officers/directors for the selected company. Supports name/title filtering when the list is long.

### `components/EmploymentTimeline.vue`

Horizontal colored bars showing each organization the executive is linked to, with role chips.

### `components/MetricOverlay.vue`

D3 line chart with area fill, rendering time-series data for a selected metric across the executive's companies. Supports stock price, revenue, net income, total assets, total liabilities, and shareholders' equity.
