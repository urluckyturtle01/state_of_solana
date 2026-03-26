# Chart YAML — how to write it (developer guide)

This doc is for someone who **already has (or will write) a `.sql`** in `tl-reserach-tool-sqls` and needs a **matching `.yaml`** so the dashboard can render. Examples below are **copied from the real repo** (same paths). Your job: **find the pattern that matches what you want**, copy it, then **rename `id`, titles, and field names** to match your SQL.

---

## 1. Non‑negotiables

| Rule | Why |
|------|-----|
| **`my.sql` and `my.yaml` share the same basename** | Sync only pairs `foo.sql` + `foo.yaml`. |
| **Every chart has a unique `id`** (UUID string) | Primary key in the DB. Generate a new UUID per chart. |
| **SQL column names = `dataMapping` names** | Aliases in `SELECT` must match `xAxis`, `yAxis[].field`, `groupBy`, etc. |
| **Use a `charts:` array** unless you intentionally use the legacy single-chart shape (§10). | One file can define many charts sharing one SQL. |

---

## 2. Pick what you are building → jump to the section

| What you want on screen | Go to |
|-------------------------|--------|
| One big number (latest / selected row) | **§3 Counter** |
| Stacked bars over time, split by category (e.g. per mint) | **§4 Stacked bar + `groupBy`** |
| One or more line series on one time axis | **§5 Line** |
| SOL and USD series with a **currency** toggle | **§6 `multipleCurrency`** |
| Left scale + right scale (two units) | **§6** or **§7** (`rightAxis: true`) |
| Bars **and** a line on the same chart | **§7 Mixed bar + line** |
| Filled area under one series | **§8 Area** |
| A table (rows × columns of text/numbers) | **§9 Table** |
| Entire YAML file = one chart, no `charts:` key | **§10 Legacy** |

---

## 3. Counter (KPI from one row)

**Use when:** you want a **single headline value** (e.g. AUM for the selected month). The UI reads **one row** from the query result; `rowIndex: -2` means “second row from the end” (Python-style negative index).

**Real file:** `RWAs/xstocks/daily_summary.yaml`

```yaml
  - id: e7b8c9d0-2222-4000-8000-000000000001
    title: AUM
    subtitle: xStocks AUM for selected month
    page: xstocks
    chartType: counter
    index: 1
    order: 1
    width: 1
    rowIndex: -2
    prefix: "$"
    suffix: ""
    variant: blue
    icon: chart
    dataMapping:
      field: AUM
      changeField: ""
```

**You must set:**

- **`dataMapping.field`** → numeric column in SQL for the KPI.
- **`rowIndex`** → which row to show (`0` = first, `-1` = last, `-2` = second from last, etc.).
- **`prefix` / `suffix`** → display formatting.
- **`variant`** / **`icon`** → card style (`variant`: e.g. `blue`, `green`, `teal`; `icon`: `chart`, `users`, `revenue` — see other counters in the same file).

**You usually omit `trendConfig`** in YAML; the pipeline can fill defaults.

---

## 4. Stacked bar + `groupBy` (one metric, many series)

**Use when:** each row has **time** (`xAxis`), **one value column**, and a **category column** that should become stacked segments (e.g. volume per `mint` per day).

**Real file:** `RWAs/stablecoins/dex_volume.yaml`

```yaml
charts:
  - id: d98aefef-d777-404c-ac22-244eb6a0296d
    title: DEX Volume
    subtitle: DEX volume by stablecoin

    page: stablecoins

    chartType: bar
    isStacked: true
    index: 11
    dataMapping:
      xAxis: block_date
      yAxis:
        - field: volume
          type: bar
          unit: "$"
      groupBy: mint
    queryRunConfig:
      isIncremental: true
      incrementalPeriod: day
      isCumulative: true
```

**Pattern:**

- **`chartType: bar`** + **`isStacked: true`** + **`groupBy: <category_column>`**
- **`yAxis`** is a **one-element list** with the **measure** and **`type: bar`**.

---

## 5. Line (one or more line series)

**Use when:** single metric or multiple lines over the same x (e.g. `epoch`).

**Real file:** `rev/total_economic_value/total_economic_value.yaml` (single-line example)

```yaml
  - id: a0b1c2d3-8888-4000-8000-000000000009
    title: REV as % of TEV
    subtitle: "Percentage of Total Economic Value that comes from real economic activity (fees + tips) rather than inflation. Higher % means the network is increasingly funded by organic usage rather than token inflation."
    page: rev
    chartType: line
    isStacked: false
    index: 3
    dataMapping:
      xAxis: epoch
      yAxis:
        - field: rev_pct_of_tev
          type: line
          unit: "%"
      groupBy: ""
    queryRunConfig:
      isIncremental: false
      incrementalPeriod: day
      isCumulative: false
```

**Pattern:** `chartType: line`, **`isStacked: false`**, **`yAxis`** = list of `{ field, type: line, unit }`. Add more list items for more lines.

---

## 6. SOL + USD + `multipleCurrency` (two scales / toggle)

**Use when:** the same chart shows **SOL** and **USD** series and the app should expose a **currency switcher**. Put **`unit: SOL`** on SOL series and **`unit: "$"`** or **`USD`** on dollar series, and set **`multipleCurrency: true`**.

**Real file:** `rev/total_economic_value/total_economic_value.yaml`

```yaml
  - id: a0b1c2d3-8888-4000-8000-000000000007
    title: REV vs TEV per Epoch
    subtitle: "Per-epoch comparison of Real Economic Value (total fees + Jito tips) and Total Economic Value (REV + SOL inflation issuance) in SOL and USD. Shows actual protocol revenue vs total value distributed to validators."
    page: rev
    chartType: bar
    isStacked: false
    index: 1
    dataMapping:
      xAxis: epoch
      yAxis:
        - field: epoch_rev_sol
          type: line
          unit: SOL
        - field: epoch_tev_sol
          type: line
          unit: SOL
        - field: epoch_rev_usd
          type: line
          unit: "$"
          rightAxis: true
        - field: epoch_tev_usd
          type: line
          unit: "$"
          rightAxis: true
      groupBy: ""
    queryRunConfig:
      isIncremental: false
      incrementalPeriod: day
      isCumulative: false
      multipleCurrency: true
```

**Note:** `chartType` is still **`bar`** here but **lines** are drawn because each **`yAxis`** entry has **`type: line`**. **`rightAxis: true`** puts USD on the secondary scale.

**Stacked SOL/USD breakdown (same file, second chart):** `chartType: bar`, **`isStacked: true`**, four `yAxis` entries (two SOL, two USD bars), **same `multipleCurrency: true`** — open `rev/total_economic_value/total_economic_value.yaml` for the full block.

---

## 7. Mixed bar + line + `rightAxis` (no `dual-axis` chartType)

**Use when:** you want **bars** for one metric and a **line** for another (different scales). Keep **`chartType: bar`**, set **`yAxis`** with **`type: bar`** and **`type: line`**, and **`rightAxis: true`** on the line.

**Real file:** `dex-trades/volume/daily_and_cumulative_volume.yaml` (legacy shape — no `charts:` wrapper)

```yaml
id: d4e5f6a7-4444-4000-8000-000000000001
title: Daily And Cumulative Volume
subtitle: Daily DEX trading volume with cumulative total in USD
page: volume
chartType: bar
isStacked: false
index: 1
dataMapping:
  xAxis: block_date
  yAxis:
    - field: daily_volume_usd
      type: bar
      unit: "$"
    - field: cumulative_volume_usd
      type: line
      unit: "$"
      rightAxis: true
  groupBy: ""
queryRunConfig:
  isIncremental: true
  incrementalPeriod: day
  isCumulative: true
```

**Second real example (two charts in one file):** `dex-trades/traders/daily_active_traders.yaml` — chart 1:

```yaml
  - id: c3d4e5f6-3333-4000-8000-000000000001
    title: Daily Active Traders
    subtitle: Daily unique traders with new trader % on right axis
    page: traders
    chartType: bar
    isStacked: false
    index: 1
    dataMapping:
      xAxis: block_date
      yAxis:
        - field: active_traders
          type: bar
          unit: ""
        - field: new_trader_pct
          type: line
          unit: "%"
          rightAxis: true
      groupBy: ""
    queryRunConfig:
      isIncremental: true
      incrementalPeriod: day
      isCumulative: false
```

---

## 8. Area

**Use when:** one continuous series as a **filled area**.

**Real file:** `dex-trades/traders/daily_active_traders.yaml` (second chart)

```yaml
  - id: c3d4e5f6-3333-4000-8000-000000000007
    title: Cumulative New Traders
    subtitle: Running total of traders making their first-ever DEX trade
    page: traders
    chartType: area
    isStacked: false
    index: 2
    dataMapping:
      xAxis: block_date
      yAxis:
        - field: cumulative_new_traders
          type: area
          unit: ""
      groupBy: ""
    queryRunConfig:
      isIncremental: true
      incrementalPeriod: day
      isCumulative: false
```

**Pattern:** `chartType: area`, **`yAxis[].type: area`**.

---

## 9. Table

**Use when:** the result is a **tabular** grid (e.g. one row per month, one column per AMM). **`xAxis`** is usually the row key; each **`yAxis`** entry is a **column**; use **`type: text`** for string cells.

**Real file:** `dex-trades/prop_amm/prop_amm_monthly_top_pool.yaml`

```yaml
charts:
  - id: f6a7b8c9-6666-4000-8000-000000000007
    title: Prop AMM Monthly Top Pool
    subtitle: "Per AMM per month: top_pool | pool_vol (K/M/B) | pool_share%"
    page: prop_amm
    chartType: table
    isStacked: false
    defaultSortColumn: month
    defaultSortDirection: desc
    dataMapping:
      xAxis: month
      yAxis:
        - field: ZeroFi
          type: text
        - field: HumidiFi
          type: text
        - field: AlphaQ
          type: text
        - field: SolFi V2
          type: text
        - field: GoonFi
          type: text
        - field: TesseraV
          type: text
        - field: Obric V2
          type: text
        - field: Aquifer
          type: text
        - field: BisonFi
          type: text
      groupBy: ""
    queryRunConfig:
      isIncremental: true
      incrementalPeriod: month
      isCumulative: false
```

**Your SQL must expose columns** whose names match **`xAxis`** and every **`field`** under **`yAxis`**.

---

## 10. Legacy file (single chart at root)

**Use when:** one chart only, no `charts:` key. Sync still accepts it if **`id`** and **`title`** are at root.

**Real file:** `dex-trades/volume/daily_and_cumulative_volume.yaml` — see full content in §7 above.

**Other legacy examples:** `dex-trades/compute/cu_by_category.yaml`, `cu_by_dex.yaml`, `dex_cu_share.yaml`.

---

## 11. `queryRunConfig` — what to set

| You need | Set |
|----------|-----|
| Daily incremental refresh | `isIncremental: true`, `incrementalPeriod: day` |
| Month-level / other grain | `incrementalPeriod: month` (etc.) |
| Cumulative / time-rollup UX in UI | `isCumulative: true` (sync may add time-aggregation options) |
| SOL vs USD switcher | `multipleCurrency: true` **and** `unit` on each `yAxis` series as in §6 |

---

## 12. After you write YAML

1. Column names in SQL **match** `dataMapping` exactly.
2. New chart → **new UUID** (`id`).
3. If you add a chart to a **multi-chart** file, every chart in that file still shares the **same** `.sql` — the query must return **all** columns needed by **every** chart in that YAML.

---

## 13. Repo inventory (for discovery)

**71** `*.yaml` files under `tl-reserach-tool-sqls`. Observed **`chartType`** usage in those files: **`bar`**, **`line`**, **`counter`**, **`table`**, **`area`** — no `pie` / `dual-axis` / `stacked-area` YAML in the repo today. **`isStacked: true`** appears only on **`bar`** in this repo.

Full path list and sync/METRICS wiring live in the pipeline (`pipeline/sync-charts-to-db.py`, `pipeline/chart_categories.py`, `pipeline/scaffold_sections.py`).

---

*Examples are taken from production YAML in `tl-reserach-tool-sqls`. Replace `id` with a new UUID for new charts.*
