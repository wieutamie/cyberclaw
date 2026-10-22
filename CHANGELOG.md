# Changelog

All notable changes to Cyber Claw are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Fixed
- **Detection percentage denominator.** The scan result donut, the report
  sidebar donut and the tooltip now all measure flagged engines against the
  engines that actually answered (`malicious + suspicious + harmless +
  undetected`) instead of every engine VT listed. Engines that timed out,
  failed or are unsupported never returned a verdict, so they no longer
  deflate the score. A scan with 65 flags out of 67 responding engines now
  reads 97%, not 87%. The number is computed by a single shared helper
  (`client/src/lib/stats.ts`) so the card and the sidebar can never drift.
- Report sidebar, summary panel and the analytics charts no longer leak
  hard-coded English strings into the Indonesian UI.

### Changed
- Loosened cramped spacing across the UI: vendor report list (column gutters,
  per-row padding + hover, header legend with engine count), report sidebar
  (donut 160px, wider card gaps, readable captions), result card (unified
  16px rhythm, negative margins removed, roomier status cards and metadata
  box), history filters, analytics KPI strip (responsive on mobile) and the
  full report panel padding.
- Added translation keys for the report sidebar, summary panel, empty chart
  states and the "Back to Dashboard" links (`en` + `id`).

### Removed
- `client/vercel.json` — dead config. The project is deployed from the repo
  root, which owns the real `vercel.json`; the nested file was never read and
  its `/api/(.*) -> /api` rewrite contradicted the root config.

## Deployment note

This project does **not** auto-deploy from GitHub. Pushing to `main` only
updates the repository; production must be shipped with:

```bash
vercel --prod
```

To make `git push` deploy automatically, connect the repo once with
`vercel git connect` (or link it in the Vercel dashboard).
