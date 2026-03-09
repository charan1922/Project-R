## ADDED Requirements

### Requirement: Multi-Pane Rendering (v5)
The charting component SHALL utilize Lightweight Charts v5 to render multiple synchronized panes (e.g., Candlesticks on Pane 1, Volume Histogram on Pane 2).

#### Scenario: Displaying volume
- **WHEN** the user opens the Live Trading chart
- **THEN** the system renders a secondary pane underneath the price chart displaying the volume bars colored green/red corresponding to the candle close.

### Requirement: Sub-second Tick Updates
The charting component SHALL update the active candlestick series with new price ticks by natively calling the `candlestickSeries.update()` API, explicitly bypassing React state re-renders to maintain 60FPS.

#### Scenario: High-frequency price fluctuation
- **WHEN** 10 new price ticks arrive within 1 second from the WebSocket
- **THEN** the chart instantly redraws the active candle's High, Low, and Close without causing the surrounding React UI to stutter.

### Requirement: Dynamic Watermarks & Event Markers
The charting component SHALL display the active Symbol as a semi-transparent watermark and plot Up/Down arrows via the v5 custom Marker Plugins for algorithmic signals.

#### Scenario: Watermark initialization
- **WHEN** the chart is loaded for the `DIVISLAB` symbol
- **THEN** the background displays "DIVISLAB" prominently and transparently in the center of the canvas pane.
