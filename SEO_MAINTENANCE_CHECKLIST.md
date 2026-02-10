# SEO Maintenance Checklist

## When Adding New Charts

### Automatic (Run this script):
- [ ] `npm run update-seo` or `node scripts/update-seo-for-new-content.js`

### Manual Steps:
- [ ] Verify chart has proper title and description in config
- [ ] Test chart URL loads correctly
- [ ] Submit top 5-10 new chart URLs to Google Search Console

---

## When Adding New Pages

### Before Creating Page:
- [ ] Plan URL structure (keep it clean and descriptive)
- [ ] Ensure page has proper metadata

### After Creating Page:
- [ ] Add page route to `DYNAMIC_PAGES` in `scripts/generate-sitemap.js`
- [ ] Run `npm run update-seo`
- [ ] Add meta tags to page component
- [ ] Test page loads and has proper SEO tags
- [ ] Submit to Google Search Console

---

## Weekly Maintenance (5 minutes):

- [ ] Check Google Search Console "Coverage" report
- [ ] Submit 5-10 new chart URLs for indexing
- [ ] Monitor for crawl errors
- [ ] Review search performance data

---

## Monthly Maintenance (15 minutes):

- [ ] Run full SEO update: `npm run update-seo`
- [ ] Analyze top-performing pages
- [ ] Update chart descriptions if needed
- [ ] Check for broken internal links
- [ ] Review robots.txt if site structure changed

---

## Emergency SEO Issues:

### If pages not indexing:
1. Check `robots.txt` allows the pages
2. Verify sitemap includes the URLs
3. Use Google URL Inspection tool
4. Check for crawl errors in Search Console

### If SEO metadata missing:
1. Run chart SEO generator: `node scripts/generate-chart-seo.js`
2. Check page components have proper meta tags
3. Verify metadata appears in page source

---

## Quick Commands:

```bash
# Update all SEO files
npm run update-seo

# Generate new chart metadata only
node scripts/generate-chart-seo.js

# Regenerate sitemap only  
node scripts/generate-sitemap.js

# Get URL submission list
node scripts/update-seo-for-new-content.js
```
