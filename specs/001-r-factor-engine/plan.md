# Implementation Plan: R-Factor Engine

**Branch**: `001-r-factor-engine` | **Date**: 2026-02-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-r-factor-engine/spec.md`

## Summary

Implement a robust calculation engine to compute the 4-Factor Z-Scores (Volume, OI, Turnover, Spread) using 20-day rolling statistical windows. This engine will serve as the core analytical module for identifying "Blast" trades and classifying market regimes ("Elephant" vs "Cheetah").

## Technical Context

**Language/Version**: TypeScript 5.7+ (Node.js 22 LTS)  
**Primary Dependencies**: `mathjs` (v14.0.0+), `stock-nse-india` (v1.3.0) for OI data, `zod` (v4.3.6) for validation.  
**Frontend Framework**: Next.js 16.1.6 (React 19.2.3)  
**Styling**: Tailwind CSS 4.0, Lucide React 0.564.0  
**Storage**: JSON for historical persistence (transition to `sqlite` if scalability requires).  
**Testing**: `vitest` (latest) for mathematical model verification.  
**Target Platform**: Node.js Backend / Browser-compatible Library  
**Project Type**: Library/Internal Engine  
**Performance Goals**: Calculate factors for 200+ symbols in < 500ms.  
**Scale/Scope**: Initial support for NSE F&O universe (~200 symbols).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Data-Driven Alpha**: Uses Z-score normalization as requested.
- [x] **Library-First Core Logic**: Planned as a standalone library in `src/lib/r-factor`.
- [x] **Radical Observability**: Z-score components will be exposed for dashboard visualization.
- [x] **Safety & Risk-First**: Engine will provide data for risk calculations.
- [x] **Empirical Verification**: Initial release will be validated against historical "Blast" trades.

## Project Structure

### Documentation (this feature)

```text
specs/001-r-factor-engine/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
lib/
└── r-factor/
    ├── index.ts      # Public API
    ├── engine.ts     # Core calculation logic
    ├── stats.ts      # Rolling mean/stddev utilities
    └── types.ts      # Signal and Config types
tests/
└── r-factor/
    └── engine.test.ts # Mathematical verification tests
```

**Structure Decision**: Option 1: Single project. The engine will live in `lib/r-factor/` (root) to be easily imported by both the dashboard (Next.js) and the extractor (Playwright scripts).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A       | -          | -                                   |
