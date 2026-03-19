// R-Factor Engine Module Exports
//
// This module provides institutional activity scoring for Indian F&O stocks.
//
// V4 Improvements:
// - Ensemble model (OLS + spread-quadratic + momentum)
// - Scale correction for extreme R-Factor values
// - Robust regression with Huber loss
// - Enhanced feature engineering (acceleration, multi-day patterns)
// - Market context adjustment (VIX, NIFTY, FII flows)
// - Dynamic adaptive lookback window
// - Dhan-NSE data calibration

// Core engine
export { engine, RFactorEngine } from './engine';

// Types and data transforms
export * from './types';

// Statistics utilities
export * from './stats';

// Data services
export { BhavcopyNotSyncedError, getHistoricalData, importFromCache, syncBhavcopy } from './bhavcopy-service';
export { RFactorDataService, rFactorService, type BoostSignal, type ScanResult } from './data-service';

// Ensemble models
export {
  predictOLS,
  predictSpreadQuadratic,
  predictMomentum,
  predictEnsemble,
  selectBestModel,
  type ModelPrediction,
} from './ensemble';

// Market context
export {
  getMarketContext,
  adjustForMarketContext,
  classifyMarketRegime,
  getPositionSizeMultiplier,
  clearMarketContextCache,
  setMarketContext,
} from './market-context';

// Dhan-NSE calibration
export {
  DHAN_NSE_CALIBRATION,
  SYMBOL_SPECIFIC_CALIBRATION,
  calibrateFuturesData,
  calibrateEquityData,
  computeCalibratedSpread,
  computeCalibratedTurnover,
  getDhanDataConfidence,
  adjustZScoreForDhan,
  estimateDhanPenalty,
} from './calibration';
