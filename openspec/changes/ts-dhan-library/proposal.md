## Why

The current ecosystem provides a robust Python SDK (`dhanhq-py`) for interacting with the DhanHQ v2 API, but lacks an official or equivalent TypeScript library. By creating a TypeScript library with 1:1 parity to the Python SDK, we enable JavaScript/TypeScript developers and Node.js backends to integrate seamlessly with Dhan's trading infrastructure (orders, portfolio, historical data, etc.) while leveraging TypeScript's strong static typing and modern async/await patterns.

## What Changes

A new self-contained TypeScript library will be built in the `dhan` routing/folder (as requested). It will feature:
- A main `dhanhq` client class equivalent to its Python counterpart.
- Full typing for all Dhan API endpoints (sandbox and prod), generated based on the OpenAPI definitions.
- Modules for Orders, Forever Orders, Super Orders, Portfolio, Funds, Historical Data, Market Feed, and eDIS.
- Zero-dependency or minimal-dependency architecture (e.g., using native `fetch` or `axios` with standard Node integrations).

## Capabilities

### New Capabilities
- `dhan-ts-sdk`: End-to-end DhanHQ trading API integration in TypeScript, matching the v2 API and Python SDK parity.

### Modified Capabilities

## Impact

- **New Code**: Adds a complete TS library inside the `./dhan` folder of the project.
- **Dependencies**: May add minimal dependencies like `axios` (if preferred over `fetch`) or standard linting/testing utilities.
- **Systems**: Translates Python `requests`-based synchronous/asynchronous logic into idiomatic Promise-based TypeScript architectures.
