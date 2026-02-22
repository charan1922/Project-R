# Tasks: R-Factor Engine

**Input**: Design documents from `specs/001-r-factor-engine/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project structure for R-Factor engine in `lib/r-factor/`
- [x] T002 Install `mathjs` dependency
- [x] T003 Define core types and interfaces in `lib/r-factor/types.ts`
- [x] T004 Implement rolling statistical utilities in `lib/r-factor/stats.ts`
- [x] T005 Implement core `RFactorEngine` class in `lib/r-factor/engine.ts`
- [x] T006 [P] Create public API in `lib/r-factor/index.ts`

---

## Phase 2: Backend Integration (Next.js)

**Purpose**: Expose the R-Factor engine through Next.js API routes

- [x] T007 Create NSE data service in `lib/nse-service.ts` to fetch historical and real-time data (Volume, OI, Turnover, Spread)
- [x] T008 Implement `app/api/r-factor/route.ts` to calculate and return R-Factor signals for a given symbol
- [x] T009 [P] Implement bulk R-Factor scan endpoint or integrate into existing `app/api/stocks/route.ts`
- [x] T010 [P] Add caching (e.g., in-memory or file-based) for historical data to avoid redundant NSE API calls

---

## Phase 3: User Story 1 - Calculate Base Z-Scores (Priority: P1) 🎯 MVP

**Goal**: Calculate Z-scores for Volume and Open Interest using a 20-day lookback via Next.js API.

- [x] T011 Update `app/api/r-factor/route.ts` to fetch 20-day historical data
- [x] T012 Map NSE data to `FactorData` structure
- [x] T013 Verify Z-score outputs in API response using manual/sample checks

---

## Phase 4: User Story 2 - Turnover & Spread Factors (Priority: P2)

**Goal**: Calculate Z-scores for Turnover and Spread; implement regime detection in backend.

- [x] T014 Implement Turnover calculation (`price * volume`) in `nse-service.ts`
- [x] T015 Implement Spread calculation (if tick data available) or use proxy (High-Low / LTP)
- [x] T016 Update `RFactorEngine` classification logic to use these factors

---

## Phase 5: User Story 3 - Composite R-Factor Score (Priority: P3)

**Goal**: Calculate a weighted composite R-Factor score and expose via API.

- [x] T017 Finalize `calculateCompositeScore` in backend
- [x] T018 Return full `SignalOutput` in `app/api/r-factor/route.ts`

---

## Phase 6: Polish & Dashboard Integration

- [x] T019 Update `app/learning/r-factor-engine/page.tsx` or create a new "Live Signal" component
- [ ] T020 [P] Add rate limiting and error handling for NSE API calls
- [x] T021 [P] Final code cleanup and documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1. Blocks all US tasks.
- **Phase 3 (US1)**: Depends on Phase 2. (P1 Priority)
- **Phase 4 (US2)**: Depends on Phase 2. (P2 Priority)
- **Phase 5 (US3)**: Depends on Phase 2, US1, and US2.

### Parallel Opportunities

- T002, T003 (Setup)
- T006, T007 (Foundational)
- All test tasks marked [P]
- US1 and US2 can be developed in parallel once Foundational is done.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Setup + Foundation (T001-T007)
2. User Story 1 (T008-T012)
3. **Validate**: Run PNB Case Study test.

### Incremental Delivery

1. Deliver US1 (Blast Trade Detection)
2. Deliver US2 (Regime Classification)
3. Deliver US3 (Composite Scoring)
