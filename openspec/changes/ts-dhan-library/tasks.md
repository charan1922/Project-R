## 1. Setup & Fundamentals

- [x] 1.1 Create `dhan` routing folder
- [x] 1.2 Generate `types.ts` from `sandbox-dhan.json` and `prod-dhan.json` mapping all Request/Response properties
- [x] 1.3 Create `http_client.ts` encapsulating native `fetch`, injecting headers, and handling JSON parses

## 2. Core SDK Implementation

- [x] 2.1 Write `dhanhq.ts` base class with environment switching and initialization
- [x] 2.2 Implement `/orders` placing logic (Regular, Super, Forever)
- [x] 2.3 Implement `/orders` modifying and cancelling logic
- [x] 2.4 Implement `/holdings` and `/positions` fetching from portfolio
- [x] 2.5 Implement Historical Data and Market Feed modules
- [x] 2.6 Implement eDIS generation methods
- [x] 2.7 Implement Trader Control methods

## 3. Verification & Checks

- [x] 3.1 Verify exactly 1:1 typing casing vs Python SDK
- [x] 3.2 Construct mock responses and test payload parsing methods for accuracy
