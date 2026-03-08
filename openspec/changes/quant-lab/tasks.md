## 1. Core Utilities & Data

- [ ] 1.1 Implement `math-utils.ts` for rolling means, standard deviations, and exponential smoothing
- [ ] 1.2 Implement Indian fee models in `fees.ts`
- [ ] 1.3 Implement `data-loader.ts` to seamlessly hit SQLite and securely fall back to the live Dhan API

## 2. Backtesting Engine

- [ ] 2.1 Develop `backtest-engine.ts` with additive multi-entry accumulation matching `vectorbt`
- [ ] 2.2 Implement EMA Crossover strategy template
- [ ] 2.3 Implement Dual Momentum strategy template
- [ ] 2.4 Implement RSI Accumulation strategy template
- [ ] 2.5 Implement baseline Buy & Hold strategy template

## 3. Sector Rotation Engine (RRG)

- [ ] 3.1 Define 12 NSE sectors, benchmarks, and configuration in `sectors.ts`
- [ ] 3.2 Develop `rrg-engine.ts` returning mathematically normalized trails and quadrant arrays

## 4. API Endpoints

- [ ] 4.1 Create GET `/api/quant/rrg` Next.js server route
- [ ] 4.2 Create POST `/api/quant/backtest` Next.js server route

## 5. Frontend Interfaces

- [ ] 5.1 Develop Sector Rotation Canvas Page rendering dynamic momentum tails
- [ ] 5.2 Develop Backtester UI handling dynamic dates, fetching, KPI displays, and Trade Logs
- [ ] 5.3 Integrate "Quant Lab" logically into the central application sidebar
