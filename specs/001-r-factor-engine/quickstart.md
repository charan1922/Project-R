22# Quickstart: R-Factor Engine

## Usage Example

```typescript
import { RFactorEngine } from '@/lib/r-factor';

const current = {
  volume: 37050000,
  oi: 1250000,
  turnover: 4625000000,
  spread: 0.15
};

const historical = [
  // ... 19 historical FactorData points
];

const signal = RFactorEngine.calculateSignal("PNB", current, historical);

if (signal.isBlastTrade) {
  console.log("BLAST TRADE DETECTED: ", signal.zScores.volume);
}

console.log("REGIME: ", signal.regime); // 'Elephant'
```

## Running Tests

Verify the mathematical accuracy of the engine:

```bash
pnpm test:r-factor
```

## Integration with Dashboard

The engine is used by the Next.js `app/trading-lab/` pages to display real-time signal overlays on charts.

## Implementation Steps

1.  **Install Dependencies**: Ensure `mathjs` is installed.
2.  **Define Stats Lib**: Implement `src/lib/r-factor/stats.ts` for rolling statistics.
3.  **Implement Engine**: Develop the main `RFactorEngine` class in `src/lib/r-factor/engine.ts`.
4.  **Verify against PNB Case**: Run the `PNB` historical verification test in `vitest`.
