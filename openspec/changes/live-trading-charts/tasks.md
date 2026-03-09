## 1. Core State & Data Streaming

- [x] 1.1 Implement Zustand store (`useLiveTradingStore`) to track the active symbol, connection status, and latest ticks to avoid React global Context re-renders.
- [x] 1.2 Develop `lib/historify/live-market-feed.ts` to manage the Dhan WebSocket connection, authentication sequence (`DHAN_CLIENT_ID` + `DHAN_ACCESS_TOKEN`), and binary message parsing.
- [x] 1.3 Implement automatic reconnection logic and exponential backoff in the WebSocket manager to handle network drops gracefully.

## 2. Real-Time Charting Component

- [x] 2.1 Develop `RealtimeChart.tsx` implementing `lightweight-charts` v5 with a dedicated `useRef` instance for `IChartApi` to entirely bypass the React Virtual DOM on data updates.
- [x] 2.2 Configure the Multi-Pane layout (Pane 1: Candlesticks, Pane 2: Volume/Metrics Histogram) using the unified v5 API.
- [x] 2.3 Implement the native `.update({ time, open, high, low, close })` bridging pipeline to stream data seamlessly from the WebSocket parser directly into the active chart series.
- [x] 2.4 Add the dynamic Watermark plugin to display the active trading symbol centrally over the chart's secondary layer.

## 3. Live Trading Dashboard UI

- [x] 3.1 Create `app/historify/live/page.tsx` as the main route for the real-time enterprise application view.
- [x] 3.2 Build a robust Tailwind flex/grid layout physically separating the Watchlist selection sidebar from the primary interactive charting canvas.
- [x] 3.3 Implement `ResizeObserver` logic to ensure the canvas responsively auto-resizes `chart.resize(width, height)` perfectly without clipping when the browser window scales.
- [x] 3.4 Wire up the Watchlist component click handlers to toggle the active symbol in the Zustand store, correctly triggering an `unsubscribe` and a new `subscribe` event over the live WebSocket.
