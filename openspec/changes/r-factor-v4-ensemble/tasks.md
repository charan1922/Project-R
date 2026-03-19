# R-Factor V4 Ensemble — Tasks

## 1. Type System Expansion

- [x] Add `EnhancedFactorData` interface extending `FactorData` with acceleration, multi-day, volatility, and sector-relative fields
- [x] Add `MarketContext` interface (niftyChange, vixLevel, fiiNetFlow, diiNetFlow, advanceDeclineRatio)
- [x] Expand `ModelType` from `'ols' | 'spread-quad'` to `'ols' | 'spread-quad' | 'momentum' | 'ensemble'`
- [x] Expand `SignalOutput` with `rawRFactor`, `scaledRFactor`, `confidence`, `marketAdjustment`, `ensembleWeights`
- [x] Expand `EngineConfig` with `minLookback`, `maxLookback`, `scaleCorrection`, `ensembleWeights`, `robustRegression`, `thresholds.highVix`, `thresholds.strongMarketMove`
- [x] Update `DEFAULT_CONFIG` with V4 defaults
- [x] Add `transformToEnhancedFactorData()` function with momentum signal calculation

## 2. Ensemble Model

- [x] Create `lib/r-factor/ensemble.ts` with `ModelPrediction` interface
- [x] Implement `predictOLS()` — 5-feature regression with confidence scoring
- [x] Implement `predictSpreadQuadratic()` — piecewise model with spread confidence
- [x] Implement `predictMomentum()` — acceleration + multi-day + close position
- [x] Implement `predictEnsemble()` — confidence-weighted dynamic blending
- [x] Implement `selectBestModel()` — data-availability-based model selection
- [x] Verify OLS coefficients match engine.ts exactly (1.108614, 0.62457, 0.076682, 0.226081, 1.414904, -1.73339)
- [x] Verify spread-quad coefficients match (2.4491, -1.8553, 0.949)

## 3. Engine Integration

- [x] Refactor `calculateSignal()` to use `predictEnsemble()` with config-driven weights
- [x] Add `applyScaleCorrection()` — non-linear expansion above threshold 2.5
- [x] Add `applyRobustAdjustment()` — Huber-like penalty for extreme Z-scores (70/30 blend)
- [x] Add `calculateConfidence()` — factor agreement + data quality scoring
- [x] Add `computeZScores()` private helper (DRY refactor)
- [x] Add `calculateEnhancedSignal()` — enhanced data path with momentum adjustment
- [x] Add `calculateSignalOLS()` — legacy OLS-only for backward compatibility
- [x] Add `calculateAdaptiveLookback()` — volatility-based window sizing
- [x] Add `calculateSignalWithContext()` — async method that fetches market context
- [x] Preserve `calculateSignalLive()` for Dhan spread-quad path (uses `predictSpreadQuadratic` from ensemble)
- [x] Remove duplicate private `calculateSpreadQuadratic()` method (now in ensemble.ts)
- [x] Remove unused `SPREAD_QUAD` constant from engine.ts (now in ensemble.ts)
- [x] Re-export `transformToFactorData` and `transformToEnhancedFactorData`

## 4. Market Context Service

- [x] Create `lib/r-factor/market-context.ts` with day-level cache
- [x] Implement `getMarketContext()` — returns neutral defaults (TODO: NSE/BSE integration)
- [x] Implement `adjustForMarketContext()` — VIX penalty, market move amplification, FII dampening, breadth adjustment
- [x] Implement `classifyMarketRegime()` — bull/bear/neutral/volatile
- [x] Implement `getPositionSizeMultiplier()` — regime-aware sizing
- [x] Add `clearMarketContextCache()` and `setMarketContext()` for testing

## 5. Dhan-NSE Calibration

- [x] Create `lib/r-factor/calibration.ts` with empirical factors
- [x] Document `DHAN_NSE_CALIBRATION` constants (futures volume, turnover, OI, equity volume/turnover, options)
- [x] Add `SYMBOL_SPECIFIC_CALIBRATION` overrides (RELIANCE, MCX)
- [x] Implement `calibrateFuturesData()` — shares→contracts + turnover correction
- [x] Implement `calibrateEquityData()` — volume/turnover correction
- [x] Implement `computeCalibratedSpread()` — no-op (Dhan OHLC is accurate)
- [x] Implement `computeCalibratedTurnover()` — VWAP proxy with fallback
- [x] Implement `getDhanDataConfidence()` — symbol-level confidence
- [x] Implement `adjustZScoreForDhan()` — Z-score shrinkage by calibration confidence
- [x] Implement `estimateDhanPenalty()` — OLS degradation estimate for live data

## 6. Module Exports

- [x] Update `lib/r-factor/index.ts` to re-export ensemble, market-context, calibration modules
- [x] Add `BoostSignal` and `ScanResult` type exports from data-service
- [x] Add `ModelPrediction` type export from ensemble

## 7. Downstream Compatibility

- [x] Verify `data-service.ts` calls still work (3-arg `calculateSignal` and `calculateSignalLive`)
- [x] Verify `r-factor-history/route.ts` accesses valid fields (compositeRFactor, modelUsed, regime, isBlastTrade, zScores)
- [x] Add `modelUsed?: string` and `confidence?: number` to `BoostStock` interface in `use-boost-data.ts`

## 8. Python Validation Scripts

- [x] Copy `derive-r/validate_v4_robust.py` — Huber regression + ensemble validation
- [x] Copy `derive-r/validate_v4_complete.py` — full validation suite (5 tests)
- [x] Copy `derive-r/multi_day_training.py` — panel data training infrastructure
- [x] Copy `derive-r/V4_IMPROVEMENTS.md` — implementation documentation

## 9. Verification

- [x] `pnpm lint` passes (Biome check, exit 0)
- [x] `tsc --noEmit` — zero errors in changed files
- [x] OLS coefficients identical in engine.ts and ensemble.ts
- [x] Spread-quad coefficients identical in ensemble.ts
- [x] `calculateSignal()` returns `modelUsed: 'ensemble'`
- [x] `calculateSignalLive()` returns `modelUsed: 'spread-quad'`
- [x] `calculateSignalOLS()` returns `modelUsed: 'ols'`
- [x] Scale correction formula matches spec: `threshold + excess × (1 + (factor-1) × tanh(excess))`
- [x] Huber adjustment: 70% original + 30% robust (shrinkage blend)

## 10. OI Level Feature (V4.1)

- [x] Add `oi_level` to `FactorData` interface (absolute OI / 20d avg OI)
- [x] Compute `oi_level` in `transformToFactorData()` using 20-day lookback
- [x] Add `oi_level` to `SignalOutput.zScores`
- [x] Pass `oi_level` through `computeZScores()` in engine
- [x] Fix `nse-service.ts` to include `oi_level: 0` in FactorData
- [x] Update `ZScores` interface in `use-history-data.ts`

## 11. Dhan-Live Model (V4.1)

- [x] Implement `calculateDhanLiveComposite()` in engine.ts
- [x] Use `oi_level` as primary signal (coefficient 4.0 on excess above 1.0)
- [x] Add `opt_volume_z` boost (0.25), `fut_volume_z` boost (0.20), `spread_r` boost (0.30)
- [x] Cap output to [1.0, 6.0] to prevent outlier blow-up
- [x] Disable scale correction for Dhan-live path (already calibrated)
- [x] Wire into `data-service.ts` for non-option-chain live path
- [x] Test against TF: 7/18 within 0.5, 14/18 within 1.0

## 12. TradeFinder Comparison & Model Tuning (V4.1)

- [x] Discover TF computes once per day (values static despite LTP changing)
- [x] Discover spread-quad-only gives 8/10 bhavcopy top-10 overlap (vs 5/10 with ensemble)
- [x] Discover robust regression penalizes TF's top stocks (extreme Z-scores)
- [x] Change DEFAULT_CONFIG: `ensembleWeights {ols: 0.05, spreadQuad: 0.90, momentum: 0.05}`
- [x] Change DEFAULT_CONFIG: `robustRegression.enabled = false`
- [x] Validate: 8/10 top-10 overlap on bhavcopy, WAAREEENER R=5.86 vs TF 5.46
- [x] Save TF ground truth: `derive-r/ground_truth/20260319.json` (80 stocks)

## 13. Engine Presets & UI Controls (V4.1)

- [x] Add `setEngineOverrides()` / `clearEngineOverrides()` to `RFactorDataService`
- [x] Add `activeEngine` property for per-request engine config
- [x] Add `preset` and `robust` query params to `/api/r-factor` route
- [x] Add `preset` and `robust` options to `useBoostData` hook
- [x] Add radio buttons for Spread-Quad 90% vs Balanced OLS 50%
- [x] Add checkbox for Robust Regression toggle
- [x] Add styled hover `Tooltip` component with detailed explanations
- [x] Add dynamic formula description text below controls
- [x] Wire re-fetch on preset/robust change

## 14. R-Factor History V4 Updates

- [x] Add `rawRFactor`, `scaledRFactor`, `confidence` to history API response
- [x] Add `rawRFactor`, `scaledRFactor`, `confidence` to leaderboard API response
- [x] Add `oi_level` column to ZScore table (violet highlight when >1.15)
- [x] Add `confidence` column to ZScore table (green/amber/gray)
- [x] Add `oi_level` and `opt_volume` columns to Leaderboard table
- [x] Update `StockHistoryEntry` and `LeaderEntry` types with V4 fields
- [x] ZCell precision changed from `.toFixed(1)` to `.toFixed(2)` for better resolution

## 15. CLAUDE.md Updates

- [x] Rewrite R-Factor architecture section for V4 (3-tier model, 8 factors, Dhan-live composite)
- [x] Document UI-configurable engine presets and API params
- [x] Document TF comparison findings (static values, spread-dominant, OI level insight)
- [x] Add Dhan-live composite formula
- [x] Update specs & design docs references

## 16. Future Work (Not Implemented)

- [ ] Integrate NSE/BSE APIs for live market context (VIX, FII/DII, advance-decline)
- [ ] Apply Dhan-NSE calibration factors in `data-service.ts` computeLiveSignals
- [ ] Auto-apply adaptive lookback in signal computation
- [ ] Collect multi-day ground truth (TradeFinder for 5+ trading days)
- [ ] Retrain Dhan-live coefficients with time-series CV using `multi_day_training.py`
- [ ] Use previous day's close instead of LTP for spread denominator (stability fix)
- [ ] Add intraday OI tracking via Dhan charts API with `oi: true` flag
- [ ] Add intraday tick features if tick-level data becomes available
- [ ] Regime-aware weight adjustment (afternoon → reduce spread weight, increase OI weight)
- [ ] Display `rawRFactor`, `scaledRFactor`, `ensembleWeights` in Intraday Boost stock rows
