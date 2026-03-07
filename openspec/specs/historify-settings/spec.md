# Spec: historify-settings

## Overview

A new Settings page at `/historify/settings` and a companion API route at `/api/historify/settings` that allow users to configure Dhan API credentials, download behaviour, and display preferences for the Historify section of Project-R.

## User Stories

- As a user, I can enter and save my Dhan Client ID and Access Token so the app can authenticate with Dhan's API without hard-coding credentials in `.env.local`
- As a user, I can test my API connection from the Settings page and see a pass/fail indicator
- As a user, I can configure download batch size, rate limit delay, and default date range to control how the bulk downloader behaves
- As a user, I can select my preferred theme (system / light / dark) and set default chart height
- As a user, I can clear all downloaded historical data or reset settings to defaults from the Danger Zone section (with a confirmation step)

## API Contract

### `GET /api/historify/settings`
Returns the current settings object. If `data/historify-settings.json` doesn't exist, returns defaults.

**Response:**
```json
{
  "dhanClientId": "",
  "dhanAccessToken": "",
  "batchSize": 10,
  "rateLimitMs": 200,
  "defaultRange": "30",
  "theme": "dark",
  "chartHeight": 450,
  "autoRefresh": true,
  "showTooltips": true
}
```

### `POST /api/historify/settings`
Merges the posted fields with existing settings and writes to `data/historify-settings.json`.

**Request body:** partial settings object (any subset of the fields above)

**Response:** `{ "ok": true }`

## UI Sections

1. **API Configuration** — Client ID + Access Token (password input with show/hide toggle), Test Connection button (calls `GET /api/historify/stats` to verify), Save button
2. **Data Management** — Stat cards for DB size / total records / table count, plus Clear Cache / Optimize DB / Export DB action buttons
3. **Download Settings** — Batch size number input, Rate limit delay ms input, Default date range select
4. **Display Settings** — Theme select, Chart height input, Auto-refresh checkbox, Show tooltips checkbox
5. **Danger Zone** — Clear All Data, Reset to Defaults — both require a confirmation modal before acting

## Constraints

- No new npm dependencies
- Settings file path: `data/historify-settings.json` (create `data/` dir if missing)
- Sensitive fields (Access Token) must never be logged to console
- Page lives at `app/historify/settings/page.tsx`, route at `app/api/historify/settings/route.ts`
