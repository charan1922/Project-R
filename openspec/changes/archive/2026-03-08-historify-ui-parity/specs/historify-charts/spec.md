# Spec: historify-charts

## Overview

Enhance the Charts page (`app/historify/charts/page.tsx`) with a functional RSI sub-panel chart below the main candlestick chart. The RSI toggle already exists in the UI but does not render a second chart.

## User Stories

- As a user, when I check the RSI (14) checkbox, a second chart panel appears below the main candle chart showing the RSI line with overbought (70) and oversold (30) reference lines
- As a user, unchecking the RSI checkbox hides the RSI panel

## Feature Details

### RSI Sub-Panel Chart
- A second `createChart` instance mounted in `rsiChartRef` (second `useRef<HTMLDivElement>`)
- Height: 120px
- Same background/grid/text colours as main chart (derived from `resolvedTheme`)
- Contains one `LineSeries` for RSI data (colour: `#a78bfa` / violet-400)
- Two `createPriceLine` horizontal reference lines: 70 (overbought, dashed red) and 30 (oversold, dashed green)
- Price scale range locked to 0–100
- Time scale synced with main chart (`chart.timeScale().subscribeVisibleTimeRangeChange`)

### Data Source
- RSI data comes from `data.indicators.rsi` in the `/api/historify/chart-data` response
- Format: `[{ time: string, value: number }]`
- If `data.indicators.rsi` is absent or empty, RSI panel shows a "No RSI data" overlay

### Visibility Toggle
- When `showRSI` is false: RSI chart container has `hidden` class
- When `showRSI` is true: RSI chart container is visible
- The existing EMA toggle behaviour is unchanged

### Cleanup
- RSI chart must be destroyed in the `useEffect` cleanup (`rsiChart.remove()`) to avoid memory leaks on re-renders

## Constraints
- No new dependencies — `lightweight-charts` is already installed
- RSI chart ref must be separate from main chart ref
- Main chart resize handler must also resize the RSI chart
