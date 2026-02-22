# Data Model: R-Factor Engine

## Entities

### `HistoricalPoint`
Represents a single historical data point used for rolling statistics.
- `symbol`: string (e.g., "PNB", "DIXON")
- `date`: string (ISO 8601)
- `volume`: number
- `openInterest`: number
- `turnover`: number
- `avgSpread`: number

### `MarketSignal`
The output of the R-Factor engine for a specific symbol.
- `symbol`: string
- `timestamp`: string
- `factors`: 
    - `volumeZ`: number
    - `oiZ`: number
    - `turnoverZ`: number
    - `spreadZ`: number
- `compositeScore`: number (R-Factor)
- `regime`: "Elephant" | "Cheetah" | "Hybrid" | "Defensive"
- `isBlastTrade`: boolean (based on Z-score thresholds)

### `EngineConfig`
Configuration parameters for the calculation.
- `lookbackPeriod`: number (default: 20)
- `weights`: 
    - `volume`: number
    - `oi`: number
    - `turnover`: number
    - `spread`: number
- `thresholds`:
    - `blastTrade`: number (default: 3.0)
    - `regimeSwitch`: number (spread Z-score threshold)
