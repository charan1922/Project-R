# Engine Presets & UI Controls Specification

## Purpose

Allow users to switch between R-Factor model configurations via the Intraday Boost UI. Different configurations trade off TradeFinder accuracy vs model complexity.

## Location

- UI: `app/trading-lab/intraday-boost/page.tsx` → Engine Config section
- API: `app/api/r-factor/route.ts` → `preset` and `robust` query params
- Service: `lib/r-factor/data-service.ts` → `setEngineOverrides()` / `clearEngineOverrides()`
- Engine: `lib/r-factor/engine.ts` → `RFactorEngine` constructor accepts partial config

## Presets

### Spread-Quad 90% (Default) — `preset=sq-dominant`

```typescript
{
  ensembleWeights: { ols: 0.05, spreadQuad: 0.90, momentum: 0.05 },
  robustRegression: { enabled: false },
}
```

**When to use:** Default for all modes. Best TradeFinder match.

| Metric | Value |
|--------|-------|
| Top-10 overlap (bhavcopy) | 8/10 |
| Top-20 overlap (bhavcopy) | 14/20 |
| WAAREEENER accuracy | R=5.86 vs TF 5.46 (OK) |
| Model | 90% piecewise quadratic on spread ratio |

**Why it works:** TradeFinder's R-Factor is heavily spread-dominated. The spread-quadratic `R = 2.45 - 1.86×spread + 0.95×spread²` captures the non-linear amplification for extreme activity. OLS at 5% adds minor corrections without corrupting rankings.

**Why robust is OFF:** Robust regression (Huber penalty) reduces R-Factor for stocks with Z-scores > |3|. But TF's top stocks ARE the ones with extreme Z-scores (e.g., WAAREEENER opt_volume Z=3.26). Penalizing them makes rankings worse.

### Balanced OLS 50% — `preset=balanced`

```typescript
{
  ensembleWeights: { ols: 0.50, spreadQuad: 0.30, momentum: 0.20 },
  robustRegression: { enabled: true, huberEpsilon: 1.35 },
}
```

**When to use:** Experimental. Better theoretical foundation (5-factor model validated at Pearson 0.60) but worse empirical TF match.

| Metric | Value |
|--------|-------|
| Top-10 overlap (bhavcopy) | 5/10 |
| WAAREEENER accuracy | R=3.92 vs TF 5.46 (too low) |
| Model | 50% OLS regression + 30% spread-quad + 20% momentum |

**Why it underperforms:** The OLS coefficient `fut_vol_z = -1.733` is a suppressor variable. It works on bhavcopy data (where volume Z-scores have correct distribution) but amplifies noise on Dhan data. At 50% weight, this pulls down rankings for high-activity stocks.

## Robust Regression Toggle

**Checkbox:** "Robust Regression"

When **ON** (`robust=true`):
- Identifies Z-scores with |z| > 3.0 (extreme values)
- Applies Huber-like penalty: `R_robust = R × (0.7 + 0.3 × penaltyFactor)`
- Where `penaltyFactor = epsilon / |z|` for each extreme Z-score
- Maximum reduction: 30% of R-Factor

When **OFF** (`robust=false`, default):
- No penalty. Extreme Z-scores contribute fully.
- Better for TradeFinder matching (their top stocks have extreme values).

## API Parameters

```
GET /api/r-factor?mode=past&preset=sq-dominant&robust=false
GET /api/r-factor?mode=live&preset=balanced&robust=true
```

| Param | Values | Default |
|-------|--------|---------|
| `preset` | `sq-dominant`, `balanced` | `sq-dominant` (from DEFAULT_CONFIG) |
| `robust` | `true`, `false` | `false` (from DEFAULT_CONFIG) |

## Data Flow

```
UI (radio/checkbox) → useBoostData opts → URL params
→ /api/r-factor route → rFactorService.setEngineOverrides()
→ new RFactorEngine(overrides) → activeEngine
→ calculateSignal() / calculateSignalLive() uses activeEngine
```

The override is **per-request** — `clearEngineOverrides()` is called when no custom params are present, falling back to DEFAULT_CONFIG.

## UI Components

### Radio Buttons (Model Preset)
- **Spread-Quad 90%**: Green accent, shows formula on hover
- **Balanced OLS 50%**: Blue accent, shows 5-factor description on hover

### Checkbox (Robust Regression)
- Amber accent when checked
- Tooltip explains Huber penalty and why OFF is recommended

### Tooltip Component
Custom `Tooltip` component with:
- Dark popup (`bg-slate-800`, `border-slate-700`)
- Arrow pointing down
- Appears on hover with 200ms transition
- Max width 288px (w-72)
- Descriptive text with specific numbers (Pearson values, coefficients, stock examples)

### Dynamic Description Text
Below controls, `text-[10px]` description updates based on active selection:
- Shows the actual regression formula
- Shows TradeFinder match statistics
- Appends robust regression impact when toggled on
