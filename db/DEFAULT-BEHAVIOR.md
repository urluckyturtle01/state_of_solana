# Default Behavior - queryRunConfig

## Summary

If `queryRunConfig` is not specified in YAML, or if specific fields are missing, the system uses these defaults:

```yaml
queryRunConfig:
  isBackfill: true        # Default: true
  isIncremental: true     # Default: true
```

---

## isBackfill (default: true)

**Controls:** Whether to run a full backfill when SQL changes or new chart is added.

### Default Behavior (isBackfill: true)
```yaml
# No queryRunConfig specified
charts:
  - id: abc-123
    title: "My Chart"
```
**Result:** 
- New chart → Queue backfill job (fetch all historical data)
- SQL changes → Delete old data, queue backfill job

### Explicit False (isBackfill: false)
```yaml
charts:
  - id: abc-123
    title: "My Chart"
    queryRunConfig:
      isBackfill: false
```
**Result:**
- New chart → Create entry, but NO backfill (data will be fetched on next scheduled run)
- SQL changes → Keep old data, NO backfill (new SQL will be used on next scheduled run)

---

## isIncremental (default: true)

**Controls:** How scheduled jobs (every 12 hours) fetch data.

### Default Behavior (isIncremental: true)
```yaml
# No queryRunConfig specified
charts:
  - id: abc-123
    title: "My Chart"
```
**Result:** 
- Scheduled job type: `incremental`
- Process:
  1. Fill gaps (missing dates before max_date)
  2. Fetch max_date → today
  3. **Merge** (remove old dates, append new data)

### Explicit False (isIncremental: false)
```yaml
charts:
  - id: abc-123
    title: "My Chart"
    queryRunConfig:
      isIncremental: false
```
**Result:**
- Scheduled job type: `full_refresh`
- Process:
  1. Run full SQL query (2025-01-01 → today)
  2. **Replace** entire JSON data

---

## Common Configurations

### 1. Default (Recommended for most charts)
```yaml
# No queryRunConfig needed - uses defaults
charts:
  - id: abc-123
    title: "Daily DEX Volume"
```
- ✅ Backfill on new/changed SQL
- ✅ Incremental updates (efficient)

### 2. No Backfill (For large datasets)
```yaml
charts:
  - id: abc-123
    title: "Huge Dataset Chart"
    queryRunConfig:
      isBackfill: false
      isIncremental: true
```
- ❌ No backfill (saves time/resources)
- ✅ Incremental updates going forward

### 3. Always Full Refresh (For aggregated data)
```yaml
charts:
  - id: abc-123
    title: "Total Aggregated Metrics"
    queryRunConfig:
      isBackfill: true
      isIncremental: false
```
- ✅ Backfill on new/changed SQL
- 🔄 Full refresh every 12 hours (no incremental)

### 4. No Backfill + Full Refresh (For real-time aggregations)
```yaml
charts:
  - id: abc-123
    title: "Live Aggregated Stats"
    queryRunConfig:
      isBackfill: false
      isIncremental: false
```
- ❌ No backfill
- 🔄 Full refresh every 12 hours

---

## Where Defaults Are Applied

### 1. sync-charts-to-db.py (Python)
```python
# Ensure queryRunConfig has defaults
if "isBackfill" not in query_run_config:
    query_run_config["isBackfill"] = True  # Default to true
if "isIncremental" not in query_run_config:
    query_run_config["isIncremental"] = True  # Default to true
```

### 2. Database Triggers (PostgreSQL)
```sql
-- on_chart_insert trigger
backfill_enabled := COALESCE(
    (NEW.chart_config->'queryRunConfig'->>'isBackfill')::boolean, 
    true  -- Default to true
);

-- on_sql_change trigger
backfill_enabled := COALESCE(
    (NEW.chart_config->'queryRunConfig'->>'isBackfill')::boolean, 
    true  -- Default to true
);
```

### 3. pg_cron Scheduled Jobs
```sql
-- Defaults to incremental if isIncremental not specified
CASE 
    WHEN COALESCE((cd.chart_config->'queryRunConfig'->>'isIncremental')::boolean, true) 
    THEN 'incremental'
    ELSE 'full_refresh'
END
```

---

## Decision Tree

```
New Chart Added or SQL Changed
│
├─ isBackfill = true (default)
│  ├─ New sql_hash? → Queue backfill job (today → 2025-01-01)
│  └─ SQL changed? → Delete old data, queue backfill job
│
└─ isBackfill = false
   ├─ New sql_hash? → Create entry, no job
   └─ SQL changed? → Keep old data, no job

---

Every 12 Hours (pg_cron)
│
├─ isIncremental = true (default)
│  └─ Queue 'incremental' job
│     ├─ Fill gaps (missing dates)
│     ├─ Fetch max_date → today
│     └─ Merge data
│
└─ isIncremental = false
   └─ Queue 'full_refresh' job
      ├─ Run full SQL (2025-01-01 → today)
      └─ Replace all data
```

---

## Summary Table

| Scenario | isBackfill | isIncremental | Behavior |
|----------|-----------|---------------|----------|
| **Default** | `true` | `true` | Backfill on new/change, incremental updates |
| No backfill | `false` | `true` | No backfill, incremental updates only |
| Always full | `true` | `false` | Backfill on new/change, full refresh every 12h |
| Minimal | `false` | `false` | No backfill, full refresh every 12h |

---

## Best Practices

1. **Use defaults for most charts** - They provide the best balance of completeness and efficiency

2. **Set `isBackfill: false` for:**
   - Very large datasets (years of historical data)
   - Charts that don't need historical data
   - Development/testing

3. **Set `isIncremental: false` for:**
   - Aggregated metrics that need full recalculation
   - Charts where incremental updates might miss data
   - Small datasets where full refresh is fast

4. **Avoid `isBackfill: false` + `isIncremental: false` unless:**
   - You're sure you don't need historical data
   - The dataset is small enough for frequent full refreshes
