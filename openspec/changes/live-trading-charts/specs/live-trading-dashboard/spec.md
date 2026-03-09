## ADDED Requirements

### Requirement: Watchlist Symbol Selection
The Dashboard SHALL provide a UI mechanism to select which symbol from the user's Watchlist should be actively subscribed to on the Dhan WebSocket.

#### Scenario: Switching active symbols
- **WHEN** the user clicks "RELIANCE" from the Watchlist sidebar
- **THEN** the Dashboard sends an unsubscribe command for the old symbol, sends a subscribe command for RELIANCE, and clears/resets the active Lightweight Chart data array.

### Requirement: Responsive Auto-Resizing Layout
The Dashboard SHALL cleanly separate the charting canvas from the Watchlist/Control menus using modern Tailwind CSS flex/grid layouts, utilizing `ResizeObserver` for the canvas.

#### Scenario: Resizing the browser window
- **WHEN** the user drags the browser window to be smaller or larger
- **THEN** the chart canvas automatically recalculates and calls `chart.resize(width, height)` to perfectly fit its container without clipping or stretching the candlesticks.
