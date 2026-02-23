## Context

The DhanHQ API currently features a comprehensive Python SDK (`dhanhq-py`) that abstracts trading, portfolio management, and market data fetching. However, JavaScript and TypeScript ecosystems lack a similarly robust, official SDK. With an increasing number of developers building Node.js-based trading infrastructures, a native, strongly-typed TypeScript SDK is required.

## Goals / Non-Goals

**Goals:**
- Provide a 1:1 feature parity with the existing DhanHQ Python SDK.
- Support all endpoints available in the v2 API (Sandbox and Prod).
- Deliver strict TypeScript interfaces sourced from the official OpenAPI definitions.
- Ensure zero or minimal footprint (e.g., native `fetch` implementation).

**Non-Goals:**
- Implementing algorithmic trading strategies within the SDK itself (client only).
- Providing UI components.

## Decisions

- **HTTP Client**: Use the native `fetch` API (available in Node.js 18+) to minimize dependencies instead of Axios.
- **Typing Strategy**: Extract types directly from `sandbox-dhan.json` and `prod-dhan.json` to create a `types.ts` representation.
- **Architectural Match**: The TS sdk will follow the folder/file structure of the Python SDK closely (e.g., `_order.ts`, `_portfolio.ts`) but bundled into a single export strategy for TS modules.
- **Async/Await Interface**: We will expose purely asynchronous methods returning Promises, unlike Python which sometimes blends synchronous blocks.

## Risks / Trade-offs

- **Risk**: API drift between Python and TS versions if updated independently.
   *Mitigation*: We are using the exact API definitions (prod/sandbox) to generate the baseline types, which can be regenerated/audited automatically.
- **Trade-off**: Native `fetch` requires modern Node (18.x) which is fine for new TS projects, but might alienate older runtime users unless polyfilled. We will assume Node 22+ as per project guidelines.
