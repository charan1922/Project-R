import LearningModule from "@/app/components/LearningModule";

export default function BreakoutStrategiesPage() {
  return (
    <LearningModule
      moduleNumber={6}
      title="Breakout Strategies: The Blast Protocol"
      description='The "Blast Protocol" combines the technical "Breakout Beacon" with the flow-based "Intraday Boost" to identify and execute high-momentum trades.'
      sections={[
        {
          title: "The Breakout Beacon",
          content:
            "The Breakout Beacon is the technical condition for a trade. It detects when a stock's price crosses a critical level.\n\nOpening Range Breakout (ORB):\nThe algorithm calculates the 15-minute or 60-minute Opening Range (OR) - the high and low of the first 15 or 60 minutes of trading.\n\nBullish Breakout: Price > Opening Range High\nBearish Breakout: Price < Opening Range Low\n\nWhy ORB works: The opening range captures the overnight order flow and initial price discovery. Large institutional orders placed at the open create a \"battle zone.\" When price breaks out of this zone with volume, it signals that one side has won.\n\nThe Breakout Beacon alone is NOT sufficient for a trade. Many breakouts are false (especially in Cheetah stocks). This is where the Intraday Boost adds flow confirmation.",
          keyPoints: [
            "Opening Range = High/Low of first 15 or 60 minutes.",
            "Bullish: Price > OR High. Bearish: Price < OR Low.",
            "ORB captures overnight institutional order flow and initial price discovery.",
            "Breakout Beacon is necessary but NOT sufficient - requires flow confirmation.",
          ],
        },
        {
          title: "The Intraday Boost: Flow Confirmation",
          content:
            "The Intraday Boost is the flow-based condition. It confirms that the breakout is backed by institutional volume.\n\nThe Boost tracks 20 parameters across the option chain in real-time:\n- OI changes across 10 nearest Put strikes\n- OI changes across 10 nearest Call strikes\n- Aggregated into a Delta-weighted Net Institutional Sentiment Score\n\nFor a LONG trade, the Boost requires:\n1. Composite R-Factor > threshold (1.25 for Elephant, 2.0 for Cheetah)\n2. Put OI Slope > 0 (institutions writing puts = bullish floor)\n3. VWAP trending upward\n\nFor a SHORT trade, the Boost requires:\n1. Composite R-Factor > threshold\n2. Call OI Slope > 0 (institutions writing calls = bearish ceiling)\n3. VWAP trending downward\n\nOnly when BOTH the Beacon (price) and Boost (flow) align does the algorithm generate a signal.",
          keyPoints: [
            "Intraday Boost tracks 20 OI parameters across the option chain.",
            "Long signal: R-Factor > threshold + Put OI rising + VWAP trending up.",
            "Short signal: R-Factor > threshold + Call OI rising + VWAP trending down.",
            "Both Beacon AND Boost must align - this dual confirmation reduces false signals.",
          ],
        },
        {
          title: "The Blast Protocol: Entry Logic",
          content:
            "The Blast Protocol is the execution state machine:\n\nState 1 - Setup:\nPrice crosses the Opening Range boundary AND R-Factor > threshold.\n\nState 2 - Confirmation:\nDirectional OI confirms the move. For longs: Put OI rate of change is positive and accelerating. For shorts: Call OI rate of change is positive.\n\nState 3 - Trend Validation:\nVWAP (Volume Weighted Average Price) must be trending in the direction of the trade.\n\nAction:\nFor Cheetah stocks: Market Order (urgency is key, accept slippage).\nFor Elephant stocks: Limit Order pegged to Bid (use the deep order book for passive entry).\n\nReal-World Example - PNB (Feb 18, 2026):\n1. Setup: Price crossed 125.00 resistance (Breakout Beacon). Volume Z-Score = +4.41.\n2. Confirmation: Put OI at 120 strike was surging (institutions writing puts at support).\n3. Validation: VWAP was trending upward all session.\n4. Execution: Long entry near 125.50. Stock closed at 128.17 (+2.68%).\n5. Result: Clean Blast trade with high R-Factor confirmation.",
          keyPoints: [
            "State machine: Setup -> Confirmation -> Validation -> Execute.",
            "Cheetah execution: Market Orders for speed. Elephant execution: Limit Orders for precision.",
            "PNB Feb 18 was a textbook Blast: Z=4.41, Put writing at 120 strike, +2.68% gain.",
          ],
        },
        {
          title: "Risk Management & Exit Logic",
          content:
            "Every trade must have a predefined exit plan:\n\nPosition Sizing:\nSize = (Account Risk %) / (Asset Volatility * Spread Factor)\nCheetah stocks get smaller positions (higher volatility, wider spreads).\nElephant stocks get larger positions (lower volatility, tighter spreads).\n\nDynamic Exits:\n\n1. OI Reversal Exit (Highest Priority):\nIf the supporting OI trend reverses (e.g., Put OI starts dropping while you're Long), exit immediately regardless of price. Smart Money is bailing out.\n\n2. Volume Dry-Up Exit:\nIf the Volume Z-Score drops below 0 for 30+ minutes, the momentum is dead. Close the trade on a time-based stop.\n\n3. R-Factor Phase Transition:\nIf R-Factor spikes above 3.0 while price REVERSES, you're in Phase 3 (Liquidation). This is the crash zone - exit immediately or reverse the position.\n\n4. Standard Stop-Loss:\nSet below the Opening Range Low (for longs) or above the Opening Range High (for shorts). Adjusted for the asset's volatility regime.\n\nThe 12:40 PM Rule:\nIf the trend persists past 12:40 PM (European open), add to the position. If the trend fails by 12:40 PM, cut the position.",
          keyPoints: [
            "Position size is inversely proportional to volatility and spread.",
            "OI Reversal = highest priority exit signal. Smart Money leaving = you leave too.",
            "R-Factor > 3.0 + Price reversal = Phase 3 Liquidation - exit immediately.",
            "12:40 PM Rule: Trend persists = add. Trend fails = cut.",
          ],
        },
      ]}
      prevModule={{ href: "/learning/smart-money", label: "Smart Money Detection" }}
      nextModule={{ href: "/learning/backtesting-fundamentals", label: "Backtesting Fundamentals" }}
    />
  );
}
