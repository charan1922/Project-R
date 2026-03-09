## Context

Project-R requires a real-time "Live Trading" view to complement its historical DuckDB Parquet data lake. The user has specifically requested the integration of TradingView's `lightweight-charts` v5 with *all* its latest features (Multi-Pane support, advanced Watermarks, Series/Up-Down Markers, unified series API). Since Dhan V2 provides live market feeds via WebSockets, we need an architecture that seamlessly bridges high-frequency WebSocket streams to the React-based Lightweight Charts frontend without performance degradation (i.e. avoiding React re-renders on every tick).

## Goals / Non-Goals

**Goals:**
- Architect a resilient WebSocket manager for the Dhan V2 Live Market Feed.
- Implement a comprehensive React wrapper for `lightweight-charts` v5, utilizing its latest features (Multi-Pane, Watermarks, Markers, auto-scaling).
- Ensure sub-second latency for tick updates directly to the chart.
- Completely decouple the high-frequency data stream from React's standard render cycle to maintain 60FPS UI performance.

**Non-Goals:**
- Executing live trades autonomously (this change focuses purely on real-time UI telemetry and visualization parity).
- Storing the live tick data into the DuckDB Parquet data lake in real-time (historical data ingestion remains a daily batch job).

## Decisions

1.  **WebSocket State Management (Zustand over React Context):**
    - *Rationale:* React Context triggers massive re-renders for all consumers when the value changes. Streaming 4 ticks per second into a Context Provider would freeze the entire DOM. Zustand empowers the specific chart instance to subscribe to precise data slices reactively without polluting the global DOM diffing engine.
    - *Alternative:* Redux (Too much boilerplate for a single feature), React `useRef` (Doesn't trigger the necessary functional updates when we actually do want deliberate UI changes, like active price flashes).

2.  **Lightweight Charts Component Architecture (Vanilla JS Ref vs React State Props):**
    - *Rationale:* We will hold the `IChartApi` instance in a React `useRef`. When a tick arrives via the WebSocket array, we will directly call the native `candlestickSeries.update({ time, open, high, low, close })` method, bypassing the React Virtual DOM entirely. This guarantees zero UI lag because the chart handles the `<canvas>` repaints natively.
    - *Alternative:* Passing the data array as a React hook state prop (A severe anti-pattern for rapid streams that leads to infinite loops or massive garbage collection stutters).

3.  **Comprehensive Lightweight Charts v5 Adoption:**
    - *Rationale:* The user specifically prioritized enterprise-grade v5 features. We will architect exactly that:
        - **Multi-Pane Renderers:** Separating primary price action (candlestick chart) from secondary indicators (volume histograms) flawlessly.
        - **Background Watermarks:** Projecting the active Trading Symbol and Exchange as a dynamic background layer.
        - **Event Markers:** Employing the new v5 Marker plugins (Up/Down arrows) for executing and visualizing trades directly on the canvas.
        - **Crosshair Syncing:** Ensuring that hovering over the volume pane automatically syncs the crosshair across the price action pane simultaneously.

## Risks / Trade-offs

-   **[Risk] Memory Leaks from Unbounded WebSockets:** If the user toggles navigation tabs away from the Live Trading page quickly, the WebSocket might remain open redundantly in the background, draining system TCP socket limits.
    -   *Mitigation:* The WebSocket manager instance will be robustly bound to the specific React component lifecycle (via `useEffect` unmount cleanup function) to deliberately terminate the connection `ws.close()` when the Dashboard is destroyed.
-   **[Risk] Dhan Connection Resilience:** Dhan Trade/Market WebSockets require strict packet validation and heartbeat maintenance (`ping`/`pong`). If the internet connection stutters, the stream dies silently without the chart knowing.
    -   *Mitigation:* The WebSocket singleton will implement automated reconnection logic with an exponential backoff algorithm. It will independently dispatch a UI toast notification if the network drops and reconnect fails after 3 tries.
